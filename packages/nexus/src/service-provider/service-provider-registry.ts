import type { Chain } from "../chain/chain";
import type { ChainSupport, EndpointConstructor } from "./service-provider";
import { ServiceProvider } from "./service-provider";

type ChainSupportDescriptor = {
  isProduction?: boolean; // denotes whether the chain support is ready for production. defaults to true.
} & EndpointConstructor;

interface ServiceProviderDescriptor {
  supportedChains: Record<number, ChainSupportDescriptor>;
  envSecretKeyName?: string;
}

export type ServiceProviderDescriptors = Record<
  string,
  ServiceProviderDescriptor
>;

type ServiceProvidersByName = Partial<Record<string, ServiceProvider>>;

type ServiceProvidersByChainId = Partial<
  Record<number, ServiceProvidersByName>
>;

export class ServiceProviderRegistry {
  private readonly serviceProvidersByName: ServiceProvidersByName;
  private readonly serviceProvidersByChainId: ServiceProvidersByChainId;

  constructor(descriptors: ServiceProviderDescriptors) {
    this.serviceProvidersByName =
      ServiceProviderRegistry.toServiceProvidersByName(descriptors);
    this.serviceProvidersByChainId =
      ServiceProviderRegistry.toServiceProvidersByChainId(
        this.serviceProvidersByName
      );
  }

  public findOneByName(name: string): ServiceProvider | undefined {
    return this.serviceProvidersByName[name];
  }

  public findManyByChain(chain: Chain): ServiceProvider[] {
    const providers = Object.values(
      this.serviceProvidersByChainId[chain.chainId] || {}
    );

    return providers.filter((provider): provider is ServiceProvider => {
      return provider !== undefined;
    });
  }

  private static toServiceProvidersByName(
    descriptors: ServiceProviderDescriptors
  ): ServiceProvidersByName {
    const serviceProviders: ServiceProvidersByName = {};

    for (const [
      serviceProviderName,
      serviceProviderDescriptor,
    ] of Object.entries(descriptors)) {
      const supportedChains: Partial<Record<number, ChainSupport>> = {};

      for (const [chainId, chainSupportDescriptor] of Object.entries(
        serviceProviderDescriptor.supportedChains
      )) {
        supportedChains[Number(chainId)] = {
          isProduction: chainSupportDescriptor.isProduction ?? true,
          ...chainSupportDescriptor,
        };
      }

      serviceProviders[serviceProviderName] = new ServiceProvider({
        name: serviceProviderName,
        supportedChains,
        envSecretKeyName: serviceProviderDescriptor.envSecretKeyName,
      });
    }

    return serviceProviders;
  }

  private static toServiceProvidersByChainId(
    serviceProviders: ServiceProvidersByName
  ): ServiceProvidersByChainId {
    const serviceProvidersByChainId: ServiceProvidersByChainId = {};

    for (const [serviceProviderName, serviceProvider] of Object.entries(
      serviceProviders
    )) {
      for (const chainId of Object.keys(
        serviceProvider!.supportedChains
      ) as unknown as [number]) {
        if (!serviceProvidersByChainId[chainId]) {
          serviceProvidersByChainId[chainId] = {};
        }

        serviceProvidersByChainId[chainId]![serviceProviderName] =
          serviceProvider!;
      }
    }

    return serviceProvidersByChainId;
  }
}
