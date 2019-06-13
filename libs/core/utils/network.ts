const app = require('application');

class Callback extends android.net.ConnectivityManager.NetworkCallback {
  public isRegistered: boolean = false;
  constructor() {
    super();

    // necessary when extending TypeScript constructors
    return global.__native(this);
  }

  onAvailable(network: android.net.Network) {}

  onCapabilitiesChanged(
    network: android.net.Network,
    capabilities: android.net.NetworkCapabilities
  ) {}
}

export class Network {
  private connectivityManager: android.net.ConnectivityManager;
  private networkCallback: Callback;

  constructor() {
    const context = android.content.Context;
    this.connectivityManager = app.android.context.getSystemService(
      context.CONNECTIVITY_SERVICE
    );
    this.networkCallback = new Callback();
  }

  unregisterNetwork() {
    this.connectivityManager.bindProcessToNetwork(null);
    if (this.networkCallback.isRegistered) {
      this.connectivityManager.unregisterNetworkCallback(this.networkCallback);
    }
    this.networkCallback.isRegistered = false;
  }

  requestNetwork(timeoutMs: number) {
    const request = new android.net.NetworkRequest.Builder();
    // add capabilities
    // add transport types
    this.connectivityManager.requestNetwork(
      request.build(),
      this.networkCallback,
      timeoutMs
    );
  }
}
