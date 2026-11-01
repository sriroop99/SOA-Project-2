export interface ServiceInstance {
  instanceId: string;
  app: string;
  ipAddr: string;
  hostName: string;
  port: number;
  securePort: number;
  status: 'UP' | 'DOWN' | 'STARTING' | 'OUT_OF_SERVICE';
  homePageUrl: string;
  statusPageUrl: string;
  healthCheckUrl: string;
  vipAddress: string;
  secureVipAddress: string;
  countryId: number;
  dataCenterInfo: {
    '@class': string;
    name: string;
  };
  leaseInfo: {
    renewalIntervalInSecs: number;
    durationInSecs: number;
    registrationTimestamp: number;
    lastRenewalTimestamp: number;
    evictionTimestamp: number;
    serviceUpTimestamp: number;
  };
  metadata: Record<string, string>;
}

export class EurekaRegistry {
  private instances = new Map<string, ServiceInstance>();
  private startTime = Date.now();

  public register(info: Partial<ServiceInstance> & { app: string; instanceId: string; port: number }): ServiceInstance {
    const now = Date.now();
    const appUpper = info.app.toUpperCase();
    const host = info.hostName || 'localhost';
    const port = info.port;

    const instance: ServiceInstance = {
      instanceId: info.instanceId || `${host}:${appUpper}:${port}`,
      app: appUpper,
      ipAddr: info.ipAddr || '127.0.0.1',
      hostName: host,
      port,
      securePort: 443,
      status: info.status || 'UP',
      homePageUrl: info.homePageUrl || `http://${host}:${port}/`,
      statusPageUrl: info.statusPageUrl || `http://${host}:${port}/health`,
      healthCheckUrl: info.healthCheckUrl || `http://${host}:${port}/health`,
      vipAddress: appUpper.toLowerCase(),
      secureVipAddress: appUpper.toLowerCase(),
      countryId: 1,
      dataCenterInfo: {
        '@class': 'com.netflix.appinfo.InstanceInfo$DefaultDataCenterInfo',
        name: 'MyOwn',
      },
      leaseInfo: {
        renewalIntervalInSecs: 30,
        durationInSecs: 90,
        registrationTimestamp: now,
        lastRenewalTimestamp: now,
        evictionTimestamp: 0,
        serviceUpTimestamp: now,
      },
      metadata: info.metadata || {},
    };

    this.instances.set(instance.instanceId, instance);
    return instance;
  }

  public renewLease(app: string, instanceId: string): boolean {
    const inst = this.instances.get(instanceId);
    if (inst) {
      inst.leaseInfo.lastRenewalTimestamp = Date.now();
      inst.status = 'UP';
      return true;
    }
    return false;
  }

  public deregister(instanceId: string): boolean {
    return this.instances.delete(instanceId);
  }

  public getAll(): ServiceInstance[] {
    return Array.from(this.instances.values());
  }

  public getByApp(app: string): ServiceInstance[] {
    const upper = app.toUpperCase();
    return this.getAll().filter((i) => i.app === upper);
  }

  public getEurekaAppsJson() {
    const appMap = new Map<string, ServiceInstance[]>();
    for (const inst of this.instances.values()) {
      const list = appMap.get(inst.app) || [];
      list.push(inst);
      appMap.set(inst.app, list);
    }

    const applications = Array.from(appMap.entries()).map(([name, instances]) => ({
      name,
      instance: instances.map((inst) => ({
        instanceId: inst.instanceId,
        hostName: inst.hostName,
        app: inst.app,
        ipAddr: inst.ipAddr,
        status: inst.status,
        port: { '$': inst.port, '@enabled': 'true' },
        securePort: { '$': inst.securePort, '@enabled': 'false' },
        healthCheckUrl: inst.healthCheckUrl,
        statusPageUrl: inst.statusPageUrl,
        homePageUrl: inst.homePageUrl,
        dataCenterInfo: inst.dataCenterInfo,
        leaseInfo: inst.leaseInfo,
        metadata: inst.metadata,
      })),
    }));

    return {
      applications: {
        versions__delta: '1',
        apps__hashcode: `UP_${this.instances.size}_`,
        application: applications,
      },
    };
  }

  public getUptimeSeconds(): number {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }
}

export const registry = new EurekaRegistry();
