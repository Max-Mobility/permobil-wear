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

  onLost(network: android.net.Network) {}

  onUnavailable() {
    this.isRegistered = false;
  }
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

  requestNetwork(args: {
    timeoutMs?: number;
    capabilities?: number[];
    transportTypes?: number[];
  }) {
    const request = new android.net.NetworkRequest.Builder();
    // add capabilities
    const capabilities = args.capabilities || [
      android.net.NetworkCapabilities.NET_CAPABILITY_INTERNET,
      android.net.NetworkCapabilities.NET_CAPABILITY_NOT_METERED
    ];
    // add transport types
    const transportTypes = args.transportTypes || [
      android.net.NetworkCapabilities.TRANSPORT_WIFI
    ];
    // add the capabilities and transport types to the request
    capabilities.map(c => request.addCapability(c));
    transportTypes.map(t => request.addTransportType(t));
    // set timeout
    const timeoutMs = args.timeoutMs || 10 * 1000;
    this.connectivityManager.requestNetwork(
      request.build(),
      this.networkCallback,
      timeoutMs
    );
  }
}
