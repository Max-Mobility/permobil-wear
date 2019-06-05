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
      const objKeyNames = Object.keys(obj);
      const values = objKeyNames.map(key => obj[key]);
      const objValues = new Array(objKeyNames.length).fill('?');
      const dbInsertString =
        `insert into ${tableName} ` +
        `(${objKeyNames.join(',')}) values ` +
        `(${objValues.join(',')})`;
      return db.execSQL(dbInsertString, values);
    });
  }

  public updateInTable(
    tableName: string,
    setField: string,
    setValue: string,
    queries: any
  ) {
    /**
     *  expects queries to be an object of the form:
     *   {
     *     "columnId=?": <value>,
     *     ...
     *   }
     */
    return this.getDatabase().then(db => {
      const queryStrings = Object.keys(queries);
      const parameters = queryStrings.map(k => queries[k]);
      const dbUpdateString =
        `UPDATE ${tableName} SET ${setField} = ${setValue} ` +
        `WHERE ${queryStrings.join(' and ')}`;
      return db.execSQL(dbUpdateString, parameters);
    });
  }

  public getLast(tableName: string, idName: string) {
    return this.getDatabase().then(db => {
      return db.get(
        `SELECT * FROM ${tableName} ORDER BY ${idName} DESC LIMIT 1`
      );
    });
  }

  public getOne(
    tableName: string,
    queries?: any,
    orderBy?: string,
    ascending?: boolean
  ) {
    /**
     *  expects queries to be an object of the form:
     *   {
     *     "columnId=?": <value>,
     *     ...
     *   }
     */
    return this.getDatabase().then(db => {
      let parameters = null;
      let dbGetString = `SELECT * from ${tableName}`;
      if (queries) {
        let queryStrings = Object.keys(queries);
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

  public getAll(args: {
    tableName: string;
    queries?: any;
    orderBy?: string;
    ascending?: boolean;
    limit?: number;
  }) {
    /**
     *  expects queries to be an object of the form:
     *   {
     *     "columnId=?": <value>,
     *     ...
     *   }
     */
    return this.getDatabase().then(db => {
      let parameters = null;
      let tableName = args.tableName;
      let queries = args.queries;
      let orderBy = args.orderBy;
      let ascending = args.ascending;
      let limit = args.limit;
      let dbGetString = `SELECT * from ${tableName}`;
      if (queries) {
        let queryStrings = Object.keys(queries);
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
        dbGetString += ` LIMIT ${limit}`;
      }
      return db.all(dbGetString, parameters);
    });
  }
}
