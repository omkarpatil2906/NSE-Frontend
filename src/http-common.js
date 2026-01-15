import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

export default axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const resortApi = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-type": "application/json",
  },
}); 