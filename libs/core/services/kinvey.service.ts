import { Injectable } from 'injection-js';
import { device } from 'tns-core-modules/platform';
import { request } from 'tns-core-modules/http';

@Injectable()
export class KinveyService {
  public static api_base = 'https://baas.kinvey.com';
  public static api_data_endpoint = '/appdata/kid_SyIIDJjdM/';
  public static api_error_db = 'SmartDriveErrors';
  public static api_info_db = 'SmartDriveUsage';
  public static api_activity_db = 'PushTrackerActivity';

  private _auth: string = null;

  constructor() {
    // configure authorization here:
    const authorizationToEncode = new java.lang.String(
      'bradwaynemartin@gmail.com:testtest'
    );
    const data = authorizationToEncode.getBytes(
      java.nio.charset.StandardCharsets.UTF_8
    );
    this._auth =
      'Basic ' +
      android.util.Base64.encodeToString(data, android.util.Base64.NO_WRAP);
  }

  private reformatForDb(o) {
    o.id = undefined;
    o.uuid = undefined;
    o.watch_uuid = device.uuid;
  }

  post(db: string, content: any) {
    const url = KinveyService.api_base + KinveyService.api_data_endpoint + db;
    console.log(url);
    return request({
      url: url,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this._auth
      },
      content: JSON.stringify(content)
    });
  }

  put(db: string, content: any, id: any) {
    const url =
      KinveyService.api_base + KinveyService.api_data_endpoint + db + `/${id}`;
    console.log(url);
    return request({
      url: url,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this._auth
      },
      content: JSON.stringify(content)
    });
  }

  sendError(error: any, id?: string) {
    this.reformatForDb(error);
    if (id) return this.put(KinveyService.api_error_db, error, id);
    else return this.post(KinveyService.api_error_db, error);
  }

  sendInfo(info: any, id?: string) {
    this.reformatForDb(info);
    if (id) return this.put(KinveyService.api_info_db, info, id);
    else return this.post(KinveyService.api_info_db, info);
  }

  sendActivity(activity: any, id?: string) {
    this.reformatForDb(activity);
    if (id) return this.put(KinveyService.api_activity_db, activity, id);
    else return this.post(KinveyService.api_activity_db, activity);
  }
}
