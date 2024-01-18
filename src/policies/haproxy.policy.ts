import { getRepository } from "typeorm";
import { Policy, Authorization } from "../fonaments/authorization/policy";
import { User } from "../models/user/User";
import { HAProxyGroup } from "../models/system/haproxy/haproxy_g/haproxy_g.model";
import { HAProxyRule } from "../models/system/haproxy/haproxy_r/haproxy_r.model";
import { Firewall } from "../models/firewall/Firewall";

export class HAProxyPolicy extends Policy {
    static async index(firewall: Firewall, user: User): Promise<Authorization> {
        user = await getRepository(User).findOneOrFail(user.id, { relations: ['fwClouds'] });
        firewall = await getRepository(Firewall).findOneOrFail(firewall.id, { relations: ['fwCloud'] });

        if (user.role === 1) {
            return Authorization.grant();
        }

        const match = user.fwClouds.filter((fwcloud) => { return fwcloud.id === firewall.fwCloudId });

        return match.length > 0 ? Authorization.grant() : Authorization.revoke();
    }

    static async show(HAProxy: HAProxyRule, user: User): Promise<Authorization> {
        user = await this.getUser(user.id);
        if (user.role === 1) {
            return Authorization.grant();
        }

        HAProxy = await this.getHAProxyR(HAProxy.id);

        return this.checkAuthorization(user, HAProxy.firewall.fwCloud.id);
    }

    static async create(firewall: Firewall, user: User): Promise<Authorization> {
        user = await getRepository(User).findOneOrFail(user.id, { relations: ['fwClouds'] });
        firewall = await getRepository(Firewall).findOneOrFail(firewall.id, { relations: ['fwCloud'] });

        if (user.role === 1) {
            return Authorization.grant();
        }

        const match = user.fwClouds.filter((fwcloud) => { return fwcloud.id === firewall.fwCloudId });

        return match.length > 0 ? Authorization.grant() : Authorization.revoke();
    }

    static async copy(HAProxy: HAProxyRule, user: User): Promise<Authorization> {
        user = await this.getUser(user.id);
        if (user.role === 1) {
            return Authorization.grant();
        }

        HAProxy = await this.getHAProxyR(HAProxy.id);

        return this.checkAuthorization(user, HAProxy.firewall.fwCloud.id);
    }

    static async move(firewall: Firewall, user: User): Promise<Authorization> {
        user = await getRepository(User).findOneOrFail(user.id, { relations: ['fwClouds'] });
        firewall = await getRepository(Firewall).findOneOrFail(firewall.id, { relations: ['fwCloud'] });

        if (user.role === 1) {
            return Authorization.grant();
        }

        const match = user.fwClouds.filter((fwcloud) => { return fwcloud.id === firewall.fwCloudId });

        return match.length > 0 ? Authorization.grant() : Authorization.revoke();
    }

    static async update(HAProxy: HAProxyRule, user: User): Promise<Authorization> {
        user = await this.getUser(user.id);
        if (user.role === 1) {
            return Authorization.grant();
        }

        HAProxy = await this.getHAProxyR(HAProxy.id);

        return this.checkAuthorization(user, HAProxy.firewall.fwCloud.id);
    }

    static async delete(HAProxy: HAProxyRule, user: User): Promise<Authorization> {
        user = await this.getUser(user.id);
        if (user.role === 1) {
            return Authorization.grant();
        }

        HAProxy = await this.getHAProxyR(HAProxy.id);

        return this.checkAuthorization(user, HAProxy.firewall.fwCloud.id);
    }

    private static async checkAuthorization(user: User, fwCloudId: number): Promise<Authorization> {
        const match = user.fwClouds.filter((fwcloud) => fwcloud.id === fwCloudId);

        return match.length > 0 ? Authorization.grant() : Authorization.revoke();
    }

    private static getHAProxyR(HAProxyId: number): Promise<HAProxyRule> {
        return getRepository(HAProxyRule).findOneOrFail(HAProxyId, { relations: ['group', 'firewall', 'firewall.fwCloud'] });
    }

    private static getUser(userId: number): Promise<User> {
        return getRepository(User).findOneOrFail(userId, { relations: ['fwClouds'] });
    }
}
