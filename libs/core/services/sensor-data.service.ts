import { Injectable } from 'injection-js';
import { Log } from '../utils';

@Injectable()
export class SensorDataService {
  constructor() {
    Log.D('SensorDataService constructor...');
  }
}
