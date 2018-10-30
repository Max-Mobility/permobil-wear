export class BlueFruit {
  public static UART_Service = '6E400001-B5A3-F393-E0A9-E50E24DCCA9E';
  public static DFU_Service = '00001530-1212-EFDE-1523-785FEABCD123';

  public static isBlueFruitDevice(dev: any): boolean {
    return (
      dev.getName().includes('Bluefruit') ||
      dev.getUuids().indexOf(BlueFruit.UART_Service) > -1
    );
  }
}
