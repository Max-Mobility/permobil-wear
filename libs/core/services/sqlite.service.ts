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

  public updateInTable(tableName: string, sets: any, queries: any) {
    /**
     *  expects sets to be an object of the form:
     *   {
     *     "columnId": <value>,
     *     ...
     *   }
     *  and
     *  expects queries to be an object of the form:
     *   {
     *     "columnId": <value>,
     *     ...
     *   }
     */
    return this.getDatabase().then(db => {
      const setsStrings = Object.keys(sets);
      const setValues = setsStrings.map(s => {
        return `${s}=${sets[s]}`;
      });
      const queryStrings = Object.keys(queries).map(q => `${q}=${queries[q]}`);
      const dbUpdateString =
        `UPDATE ${tableName} ` +
        `SET ${setValues.join(', ')} ` +
        `WHERE ${queryStrings.join(' and ')}`;
      return db.execSQL(dbUpdateString);
    });
  }

  public getLast(tableName: string, idName: string) {
    return this.getDatabase().then(db => {
      return db.get(
        `SELECT * FROM ${tableName} ORDER BY ${idName} DESC LIMIT 1`
      );
    });
  }

  public getOne(args: {
    tableName: string;
    queries?: any;
    orderBy?: string;
    ascending?: boolean;
  }) {
    /**
     *  expects queries to be an object of the form:
     *   {
     *     "columnId": <value>,
     *     ...
     *   }
     */
    return this.getDatabase().then(db => {
      const tableName = args.tableName;
      const queries = args.queries;
      const orderBy = args.orderBy;
      const ascending = args.ascending;
      let dbGetString = `SELECT * from ${tableName}`;
      if (queries) {
        const queryStrings = Object.keys(queries).map(
          q => `${q}=${queries[q]}`
        );
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
      return db.get(dbGetString);
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
     *     "columnId": <value>,
     *     ...
     *   }
     */
    return this.getDatabase().then(db => {
      const tableName = args.tableName;
      const queries = args.queries;
      const orderBy = args.orderBy;
      const ascending = args.ascending;
      const limit = args.limit;
      let dbGetString = `SELECT * from ${tableName}`;
      if (queries) {
        const queryStrings = Object.keys(queries).map(
          q => `${q}=${queries[q]}`
        );
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
      return db.all(dbGetString);
    });
  }

  public getSum(tableName: string, columnName: string) {
    return this.getDatabase()
      .then(db => {
        const dbString = `SELECT SUM(${columnName}) as Total FROM ${tableName}`;
        return db.execSQL(dbString);
      })
      .then(row => {
        return row && row[0];
      });
  }
}
