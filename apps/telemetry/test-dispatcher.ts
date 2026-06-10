import { submitMetricRequest } from './src/telemetry/onchain-dispatcher.js';
import * as dotenv from 'dotenv';
dotenv.config();
submitMetricRequest('https://httpbin.org/get?deviation=99', '$.args.deviation')
  .then(console.log)
  .catch(console.error);
