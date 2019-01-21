import { Sentry, SentryBreadcrumb, SentryOptions } from 'nativescript-sentry';

export function logError(error) {
  console.log(error);
  Sentry.captureException(error, {});
}

export function logMessage(message: string, options: SentryOptions = {}) {
  Sentry.captureMessage(message, options);
}

export function logBreadCrumb(
  message,
  category: LoggingCategory = LoggingCategory.Info,
  data = {}
) {
  const breadcrumb: SentryBreadcrumb = {
    message,
    category,
    data
  };
  Sentry.captureBreadcrumb(breadcrumb);
}

export enum LoggingCategory {
  Info = 'Info',
  Warning = 'Warning'
}
