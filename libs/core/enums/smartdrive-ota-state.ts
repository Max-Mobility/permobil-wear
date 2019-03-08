export enum SD_OTA_State {
  not_started = 'ota.sd.state.not-started',
  awaiting_versions = 'ota.sd.state.awaiting-versions',
  awaiting_mcu_ready = 'ota.sd.state.awaiting-mcu-ready',
  updating_mcu = 'ota.sd.state.updating-mcu',
  awaiting_ble_ready = 'ota.sd.state.awaiting-ble-ready',
  updating_ble = 'ota.sd.state.updating-ble',
  rebooting_ble = 'ota.sd.state.rebooting-ble',
  rebooting_mcu = 'ota.sd.state.rebooting-mcu',
  verifying_update = 'ota.sd.state.verifying',
  complete = 'ota.sd.state.complete',
  canceling = 'ota.sd.state.canceling',
  canceled = 'ota.sd.state.canceled',
  failed = 'ota.sd.state.failed',
  comm_failure = 'ota.sd.state.comm-failure',
  timeout = 'ota.sd.state.timeout'
}
