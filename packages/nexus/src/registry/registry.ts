import { Chain } from "@src/chain";
import { Network } from "@src/chain/network";
import { methodDescriptorRegistry } from "@src/method-descriptor/default-method-descriptor-registry";
import type { ChainSupport } from "@src/service-provider";
import { ServiceProvider } from "@src/service-provider";

type RecursiveChainFn = (params: {
  chainId: number;
  name: string;
  blockTime: number;
}) => {
  chain: RecursiveChainFn;
  network: NetworkBuilder["network"];
};

class NetworkBuilder {
  constructor(private readonly registry: Registry) {}

  public network(
    name: string,
    aliases?: string[]
  ): ReturnType<RecursiveChainFn> {
    const network = Network.init(this.registry, name, aliases);
    const chainBuilder = new ChainBuilder(this.registry, this, network);

    const chain = chainBuilder.init.bind(chainBuilder);

    return {
      chain,
      network: this.network.bind(this),
    };
  }
}

class ChainBuilder {
  constructor(
    private readonly registry: Registry,
    private readonly networkBuilder: NetworkBuilder,
    private readonly network: Network
  ) {}

  public init({
    chainId,
    name,
    blockTime,
  }: {
    chainId: number;
    name: string;
    blockTime: number;
  }): ReturnType<RecursiveChainFn> {
    Chain.init(this.registry, {
      chainId,
      name,
      network: this.network,
      blockTime,
    });

    return {
      chain: this.init.bind(this),
      network: this.networkBuilder.network.bind(this.networkBuilder),
    };
  }
}

export class Registry {
  private readonly networks: Map<string, Network>;
  private readonly chains: Map<number, Chain>;
  private readonly serviceProviders: Map<string, ServiceProvider>;
  private readonly supportedChains: Map<number, Set<ServiceProvider>>;
  private readonly networkBuilder = new NetworkBuilder(this);
  private readonly serviceProviderBuilder = new ServiceProviderBuilder(this);

  public readonly methodDescriptorRegistry = methodDescriptorRegistry;

  constructor(
    params: {
      networks?: Map<string, Network>;
      chains?: Map<number, Chain>;
      serviceProviders?: Map<string, ServiceProvider>;
      supportedChains?: Map<number, Set<ServiceProvider>>;
    } = {}
  ) {
    this.networks = params.networks || new Map<string, Network>();
    this.chains = params.chains || new Map<number, Chain>();
    this.serviceProviders =
      params.serviceProviders || new Map<string, ServiceProvider>();
    this.supportedChains =
      params.supportedChains || new Map<number, Set<ServiceProvider>>();
  }

  public network(
    name: string,
    aliases?: string[]
  ): ReturnType<RecursiveChainFn> {
    return this.networkBuilder.network(name, aliases);
  }

  public provider(
    name: string
  ): ReturnType<ServiceProviderBuilder<Registry>["serviceProvider"]> {
    return this.serviceProviderBuilder.serviceProvider(name);
  }

  public registerNetwork(network: Network, aliases?: string[]) {
    const existingNetwork = this.networks.get(network.name);

    if (existingNetwork && existingNetwork !== network) {
      throw new Error(`Network ${network.name} already exists`);
    }

    this.networks.set(network.name, network);

    aliases?.forEach((alias) => {
      if (this.networks.has(alias)) {
        throw new Error(`Network alias: ${alias} already exists`);
      }

      this.networks.set(alias, network);
    });
  }

  public getNetwork(name: string): Network | undefined {
    return this.networks.get(name);
  }

  public registerChain(chain: Chain) {
    const existingChain = this.chains.get(chain.chainId);

    if (existingChain && existingChain !== chain) {
      throw new Error(`Chain ${chain.chainId} already exists`);
    }

    this.chains.set(chain.chainId, chain);
  }

  public getChainById(chainId: number): Chain | undefined {
    return this.chains.get(chainId);
  }

  public registerServiceProvider(serviceProvider: ServiceProvider) {
    const existingServiceProvider = this.serviceProviders.get(
      serviceProvider.name
    );

    if (
      existingServiceProvider &&
      existingServiceProvider !== serviceProvider
    ) {
      throw new Error(`ServiceProvider ${serviceProvider.name} already exists`);
    }

    this.serviceProviders.set(serviceProvider.name, serviceProvider);
  }

  public getServiceProvider(name: string): ServiceProvider | undefined {
    return this.serviceProviders.get(name);
  }

  public getServiceProvidersSupportingChain(chain: Chain): ServiceProvider[] {
    return Array.from(this.supportedChains.get(chain.chainId) ?? []);
  }

  public registerSupportedChain(
    chainId: number,
    serviceProvider: ServiceProvider
  ) {
    const existingChain = this.chains.get(chainId);
    const existingServiceProvider = this.serviceProviders.get(
      serviceProvider.name
    );

    if (!existingChain) {
      throw new Error(`Chain ${chainId} not registered`);
    }

    if (!existingServiceProvider) {
      throw new Error(`ServiceProvider ${serviceProvider.name} not registered`);
    }

    const existingChainSupport = this.supportedChains.get(chainId);

    if (existingChainSupport) {
      existingChainSupport.add(serviceProvider);
    } else {
      this.supportedChains.set(chainId, new Set([serviceProvider]));
    }
  }

  public getChainByNames(
    networkName: string,
    chainName: string
  ): Chain | undefined {
    const network = this.networks.get(networkName);

    if (!network) {
      return undefined;
    }

    return network.getChain(chainName);
  }

  // TODO: test
  public getChainByOptionalParams(params: {
    chainId?: number;
    networkName?: string;
    chainName?: string;
  }): Chain | undefined {
    const { chainId, networkName, chainName } = params;

    if (chainId) {
      return this.getChainById(chainId);
    }

    if (networkName && chainName) {
      return this.getChainByNames(networkName, chainName);
    }

    return undefined;
  }

  public getServiceProviderByName(name: string): ServiceProvider | undefined {
    return this.serviceProviders.get(name);
  }
}

class ServiceProviderBuilder<R extends Registry> {
  constructor(private readonly registry: R) {}

  public serviceProvider(name: string) {
    const serviceProvider = ServiceProvider.init(this.registry, name);
    const chainBuilder = new ChainSupportBuilder(
      this.registry,
      this,
      serviceProvider
    );

    return {
      support: chainBuilder.chainSupport.bind(chainBuilder),
    };
  }
}

type RecursiveChainSupportFn<R extends Registry> = (
  chainId: number,
  support: ChainSupport
) => {
  support: RecursiveChainSupportFn<R>;
  provider: ServiceProviderBuilder<R>["serviceProvider"];
};

class ChainSupportBuilder<R extends Registry> {
  constructor(
    private readonly registry: R,
    private readonly serviceProviderBuilder: ServiceProviderBuilder<R>,
    private readonly serviceProvider: ServiceProvider
  ) {}

  public chainSupport(
    chainId: number,
    support: ChainSupport
  ): ReturnType<RecursiveChainSupportFn<R>> {
    this.serviceProvider.addChainSupport(chainId, support);
    this.registry.registerSupportedChain(chainId, this.serviceProvider);

    return {
      support: this.chainSupport.bind(this),
      provider: this.serviceProviderBuilder.serviceProvider.bind(
        this.serviceProviderBuilder
      ),
    };
  }
}
