import {
  Sentry,
  BreadCrumb,
  MessageOptions,
  Level,
  ExceptionOptions
} from 'nativescript-sentry';
import { Injectable } from 'injection-js';

export enum LoggingCategory {
  Info = 'Info',
  Warning = 'Warning'
}

@Injectable()
export class SentryService {
  public logError(error) {
    console.log(error);
    Sentry.captureException(error, {});
  }

  public logMessage(message: string, options: MessageOptions = {}) {
    Sentry.captureMessage(message, options);
  }

  public logBreadCrumb(
    message,
    category: LoggingCategory = LoggingCategory.Info,
    level: Level = Level.Info
  ) {
    console.log(
      '\n\n ***************************   BREADCRUMB   *********************************' +
        '\n\n' +
        message +
        '\n\n' +
        '***************************************************************************** \n\n'
    );

    const breadcrumb: BreadCrumb = {
      message,
      category,
      level
    };
    Sentry.captureBreadcrumb(breadcrumb);
  }
}
