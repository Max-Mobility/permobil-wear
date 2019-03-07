import {
  Sentry,
  BreadCrumb,
  MessageOptions,
  Level,
  ExceptionOptions
} from 'nativescript-sentry';

export enum LoggingCategory {
  Info = 'Info',
  Warning = 'Warning'
}

export function logError(error) {
  console.log(error);
  Sentry.captureException(error, {});
}

export function logMessage(message: string, options: MessageOptions = {}) {
  Sentry.captureMessage(message, options);
}

export function logBreadCrumb(
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
