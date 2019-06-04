import { Injectable } from 'injection-js';
const Sqlite = require('nativescript-sqlite');

@Injectable()
export class SqliteService {
  static DatabaseName: string = 'com.permobil.smartdrive.wearos';

  public getDatabase() {
    return new Sqlite(SqliteService.DatabaseName);
  }

  public closeDatabase() {
    return new Sqlite(SqliteService.DatabaseName, {
      multithreading: true
    }).then(db => {
      db.close();
    });
  }

  public makeTable(tableName: string, idName: string, keys: string[]) {
    return this.getDatabase().then(db => {
      const dbCreationString =
        `CREATE TABLE IF NOT EXISTS ${tableName} ` +
        `(${idName} INTEGER PRIMARY KEY AUTOINCREMENT, ` +
        `${keys.join(' TEXT, ')})`;
      return db.execSQL(dbCreationString);
    });
  }

  public insertIntoTable(tableName: string, obj: any) {
    return this.getDatabase().then(db => {
      const objKeyNames = obj.keys();
      const values = objKeyNames.map(key => obj[key]);
      const objValues = new Array(objKeyNames.length).fill('?');
      const dbInsertString =
        `insert into ${tableName} ` +
        `(${objKeyNames.join(',')}) values ` +
        `(${objValues.join(',')})`;
      return db.execSQL(dbInsertString, values);
    });
  }

  public getOne(
    tableName: string,
    queries?: any,
    orderBy?: string,
    ascending?: boolean
  ) {
    return this.getDatabase().then(db => {
      let parameters = null;
      let dbGetString = `SELECT * from ${tableName}`;
      if (queries) {
        let queryStrings = queries.keys();
        parameters = queryStrings.map(q => queries[q]);
        dbGetString += ` where ${queryStrings.join(' and ')}`;
      }
      if (orderBy) {
        dbGetString += ` ORDER BY ${orderBy}`;
        if (ascending) {
          dbGetString += ' ASC';
        } else {
          dbGetString += ' DESC';
        }
      }
      return db.get(dbGetString, parameters);
    });
  }

  public getAll(
    tableName: string,
    queries?: any,
    orderBy?: string,
    ascending?: boolean,
    limit?: number
  ) {
    return this.getDatabase().then(db => {
      let parameters = null;
      let dbGetString = `SELECT * from ${tableName}`;
      if (queries) {
        let queryStrings = queries.keys();
        parameters = queryStrings.map(q => queries[q]);
        dbGetString += ` where ${queryStrings.join(' and ')}`;
      }
      if (orderBy) {
        dbGetString += ` ORDER BY ${orderBy}`;
        if (ascending) {
          dbGetString += ' ASC';
        } else {
          dbGetString += ' DESC';
        }
      }
      if (limit > 0) {
        dbGetString += `LIMIT ${limit}`;
      }
      return db.all(dbGetString, parameters);
    });
  }
}
