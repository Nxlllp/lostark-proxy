'use strict';

const xorTable = [0x21,0x37,0x8B,0x72,0xA9,0x59,0x90,0xED,0x2E,0x1,0x70,0x71,0x3C,0x1E,0x8C,0x84,0x4B,0x9C,0xBF,0xD2,0x1C,0x3B,0x7A,0xA5,0xDB,0xF4,0xFB,0x57,0x44,0x96,0x27,0xFA,0xCB,0x9E,0x6B,0x30,0x76,0x6D,0x11,0xCF,0x79,0x2B,0x33,0xE7,0x81,0x6E,0x74,0xB6,0xEB,0x88,0x40,0xFE,0x60,0xCC,0x58,0xF6,0x28,0xB2,0x2C,0xC,0xC8,0x1B,0x63,0xBB,0x4C,0xD5,0xA6,0xB5,0xB7,0xEA,0x64,0x7E,0xFC,0xE5,0x14,0x66,0x8F,0xDC,0x82,0xAB,0xD6,0x34,0xEC,0x61,0x42,0x67,0xC4,0x62,0xAA,0xB,0x8,0xB8,0x92,0x7B,0xA2,0x29,0x51,0x87,0x18,0x41,0x3F,0x7D,0x7C,0xC6,0x10,0xBE,0xEF,0xDA,0xD4,0xE9,0x8D,0x32,0x9A,0xA8,0xA4,0x1F,0xA1,0x4,0x31,0x8A,0x93,0x25,0xE2,0xEE,0x0,0xF9,0x26,0x5F,0xAC,0xD9,0x8E,0xE1,0x1D,0x50,0x3A,0x1A,0xCD,0xDF,0xB9,0x46,0x12,0xFF,0xC3,0xCE,0xE6,0xBC,0x45,0x68,0xC0,0xFD,0x17,0xA7,0x48,0xA,0xDD,0xE8,0xD,0x2D,0x36,0x5D,0x2F,0x6A,0xE0,0xD0,0xB3,0x91,0xF0,0x4F,0xD8,0xA3,0xDE,0x85,0x6F,0xC5,0x47,0xC9,0x80,0xD1,0xF1,0xE3,0x19,0x5E,0x23,0x6,0x54,0xF7,0x49,0x69,0xD3,0xF3,0x35,0xF5,0x55,0x2A,0x5A,0xC1,0x5,0xD7,0xF,0x78,0xC2,0x6C,0xF8,0x65,0xAF,0x94,0x3,0x77,0x16,0xB1,0xBD,0xCA,0x3E,0x73,0x97,0xC7,0x9,0x99,0x98,0x15,0x7,0x4A,0xB0,0xBA,0xAD,0x3D,0x20,0x53,0x95,0xAE,0xA0,0x43,0x5B,0x9B,0x89,0x7F,0x22,0x24,0x39,0x2,0x38,0x9F,0xE4,0x4D,0x5C,0x52,0x83,0x13,0xF2,0xE,0x86,0x9D,0x75,0x4E,0xB4,0x56];

function fromServer(data) {
  const packet = {};
  packet.len = data.readInt16LE(0);
  packet.id = data.readInt16LE(2);
  packet.unk1 = data.readInt8(4); //0
  packet.type = data.readInt8(5); //0 = plain, 1 = xor, 2 = unk
  packet.data = Buffer.from(data.slice(6));
  
  if(packet.type !== 1) return packet;
  
  const counter = data.readUInt8(2);
  for(let i = 0; i < packet.data.length; i++) {
    packet.data[i] ^= xorTable[(i + counter) % 0xFF];
  }
  
  return packet;
}

function fromClient(data) {
  const packet = {};
  packet.len = data.readInt16LE(0);
  packet.id = data.readInt16LE(2);
  packet.unk1 = data.readInt8(4); //0
  packet.type = data.readInt8(5); //0 = plain, 1 = xor, 2 = unk
  packet.data = Buffer.from(data.slice(6));
  
  if(packet.type !== 1) return packet;
  
  //until i figure out how to calculate this counter, i will guess it from known always 0's in packet
  const counter = (Buffer.from(xorTable).toString('hex').indexOf(packet.data.toString('hex').substr(8, 8)) / 2) - 4;
  //console.log('- guessedCounter', counter);
  
  for(let i = 0; i < packet.data.length; i++) {
    packet.data[i] ^= xorTable[(i + counter) % 0xFF];
  }
  
  return packet;
}

function toServer(data, type = 1, id = 0) {
  const packetLen = data.length + 6;
  const buf = Buffer.allocUnsafe(packetLen);
  buf.writeInt16LE(packetLen, 0);
  buf.writeInt16LE(id, 2);
  buf.writeUInt8(0x00, 4); //unk1
  buf.writeUInt8(type, 5);
  
  const counter = data.readInt32LE(0);
  
  for(let i = 0; i < data.length; i++) {
    buf[i + 6] = (type === 1 ? (data[i] ^ xorTable[(i + counter) % 0xFF]) : data[i]);
  }
  
  return buf;
}

function toClient(data, type = 1, id = 0) {
  const packetLen = data.length + 6;
  const buf = Buffer.allocUnsafe(packetLen);
  buf.writeUInt16LE(packetLen, 0);
  buf.writeUInt16LE(id, 2);
  buf.writeUInt8(0x00, 4); //unk1
  buf.writeUInt8(type, 5);
  //buf.writeInt32LE(0, 6);
  
  const counter = buf.readUInt8(2)
  for(let i = 0; i < data.length; i++) {
    buf[i + 6] = (type === 1 ? (data[i] ^ xorTable[(i + counter) % 0xFF]) : data[i]);
  }
  
  return buf;
}

module.exports = {
  fromServer,
  fromClient,
  toServer,
  toClient
};