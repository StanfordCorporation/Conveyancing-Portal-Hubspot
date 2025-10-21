import dotenv from 'dotenv';

dotenv.config();

export const aircallConfig = {
  apiId: process.env.AIRCALL_API_ID,
  token: process.env.AIRCALL_TOKEN,
  fromNumber: process.env.AIRCALL_FROM_NUMBER,
  lineId: process.env.AIRCALL_LINE_ID || '846163', // Your known Line ID
  apiBase: 'https://api.aircall.io/v1',
  logEnabled: process.env.NODE_ENV === 'development'
};

export default aircallConfig;
