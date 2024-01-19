/*!
    Copyright 2023 SOLTECSIS SOLUCIONES TECNOLOGICAS, SLU
    https://soltecsis.com
    info@soltecsis.com


    This file is part of FWCloud (https://fwcloud.net).

    FWCloud is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    FWCloud is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with FWCloud.  If not, see <https://www.gnu.org/licenses/>.
*/
import { EntityRepository, FindManyOptions, FindOneOptions, In, RemoveOptions, Repository, SelectQueryBuilder } from "typeorm";
import { Offset } from "../../../../offset";
import { HAProxyRule } from "./haproxy_r.model";

interface IFindManyHAProxyRPath {
    fwcloudId?: number;
    firewallId?: number;
    haproxyGroupId?: number;
}
interface IFindOneHAProxyRPath extends IFindManyHAProxyRPath {
    id: number;
}
@EntityRepository(HAProxyRule)
export class HAProxyRepository extends Repository<HAProxyRule> {
    /**
     * Finds multiple HAProxy records in a given path.
     * 
     * @param path - The path to search for HAProxy records.
     * @param options - Additional options for the search.
     * @returns A promise that resolves to an array of HAProxy records.
     */
    async findManyInPath(path: IFindManyHAProxyRPath, options?: FindManyOptions<HAProxyRule>): Promise<HAProxyRule[]> {
        return this.find(this.getFindInPathOptions(path, options));
    }

    /**
     * Finds a HAProxy record in a specific path.
     * @param path - The path to search for the HAProxy record.
     * @param options - The options to apply to the query.
     * @returns A promise that resolves to the found HAProxy record.
     */
    findOneInPath(path: IFindOneHAProxyRPath, options?: FindManyOptions<HAProxyRule>): Promise<HAProxyRule> {
        return this.findOne(this.getFindInPathOptions(path, options));
    }

    /**
     * Moves the HAProxy rules with the specified IDs to a new position relative to the HAProxy rule with the given ID.
     * @param ids - An array of HAProxy rule IDs to be moved.
     * @param HAProxyDestId - The ID of the HAProxy rule to which the selected rules will be moved.
     * @param offset - The offset indicating whether the selected rules should be moved above or below the destination HAProxy rule.
     * @returns A promise that resolves to an array of HAProxyR objects representing the updated HAProxy rules.
     */
    async move(ids: number[], HAProxyDestId: number, offset: Offset): Promise<HAProxyRule[]> {
        const HAProxy_rs: HAProxyRule[] = await this.find({
            where: {
                id: In(ids),
            },
            order: {
                'rule_order': 'ASC',
            },
            relations: ['firewall'],
        });

        let affectedHAProxys: HAProxyRule[] = await this.findManyInPath({
            fwcloudId: HAProxy_rs[0].firewall.fwCloudId,
            firewallId: HAProxy_rs[0].firewall.id,
            haproxyGroupId: HAProxy_rs[0].group?.id,
        });

        const destHAProxy: HAProxyRule = await this.findOneOrFail({
            where: {
                id: HAProxyDestId,
            },
            relations: ['group', 'firewall'],
        });

        if (offset === Offset.Above) {
            affectedHAProxys = await this.moveAbove(HAProxy_rs, affectedHAProxys, destHAProxy);
        } else {
            affectedHAProxys = await this.moveBelow(HAProxy_rs, affectedHAProxys, destHAProxy);
        }

        await this.save(affectedHAProxys);

        await this.refreshOrders(HAProxy_rs[0].group?.id);

        return await this.find({ where: { id: In(ids) } });
    }

    /**
     * Moves the affected HAProxy rules above the specified destination HAProxy rule.
     * 
     * @param HAProxy_rs - The array of all HAProxy rules.
     * @param affectedHAProxys - The array of affected HAProxy rules.
     * @param destHAProxy - The destination HAProxy rule.
     * @returns The updated array of affected HAProxy rules.
     */
    protected async moveAbove(HAProxy_rs: HAProxyRule[], affectedHAProxys: HAProxyRule[], destHAProxy: HAProxyRule): Promise<HAProxyRule[]> {
        const destPosition: number = destHAProxy.rule_order;
        const movingIds: number[] = HAProxy_rs.map((HAProxy_r: HAProxyRule) => HAProxy_r.id);

        const currentPosition: number = HAProxy_rs[0].rule_order;
        const forward: boolean = currentPosition < destHAProxy.rule_order;

        affectedHAProxys.forEach((HAProxy_r: HAProxyRule) => {
            if (movingIds.includes(HAProxy_r.id)) {
                const offset: number = movingIds.indexOf(HAProxy_r.id);
                HAProxy_r.rule_order = destPosition + offset;
                HAProxy_r.group ? HAProxy_r.group.id = destHAProxy.group.id : HAProxy_r.group = destHAProxy.group;
            } else {
                if (forward && HAProxy_r.rule_order >= destHAProxy.rule_order) {
                    HAProxy_r.rule_order += HAProxy_rs.length;
                }

                if (!forward && HAProxy_r.rule_order >= destHAProxy.rule_order && HAProxy_r.rule_order < HAProxy_rs[0].rule_order) {
                    HAProxy_r.rule_order += HAProxy_rs.length;
                }
            }
        });

        return affectedHAProxys;
    }

    /**
     * Moves the affected HAProxy rules below the specified destination HAProxy rule.
     * 
     * @param HAProxy_rs - The array of all HAProxy rules.
     * @param affectedHAProxys - The array of affected HAProxy rules.
     * @param destHAProxy - The destination HAProxy rule.
     * @returns The updated array of affected HAProxy rules.
     */
    protected async moveBelow(HAProxy_rs: HAProxyRule[], affectedHAProxys: HAProxyRule[], destHAProxy: HAProxyRule): Promise<HAProxyRule[]> {
        const destPosition: number = destHAProxy.rule_order;
        const movingIds: number[] = HAProxy_rs.map((HAProxy_r: HAProxyRule) => HAProxy_r.id);

        const currentPosition: number = HAProxy_rs[0].rule_order;
        const forward: boolean = currentPosition < destHAProxy.rule_order;

        affectedHAProxys.forEach((HAProxy_r: HAProxyRule) => {
            if (movingIds.includes(HAProxy_r.id)) {
                const offset: number = movingIds.indexOf(HAProxy_r.id);
                HAProxy_r.rule_order = destPosition + offset + 1;
                HAProxy_r.group ? HAProxy_r.group.id = destHAProxy.group.id : HAProxy_r.group = destHAProxy.group;
            } else {
                if (forward && HAProxy_r.rule_order > destHAProxy.rule_order) {
                    HAProxy_r.rule_order += HAProxy_rs.length;
                }

                if (!forward && HAProxy_r.rule_order > destHAProxy.rule_order && HAProxy_r.rule_order < HAProxy_rs[0].rule_order) {
                    HAProxy_r.rule_order += HAProxy_rs.length;
                }
            }
        });

        return affectedHAProxys;
    }

    async remove(entities: HAProxyRule[], options?: RemoveOptions): Promise<HAProxyRule[]>;
    async remove(entity: HAProxyRule, options?: RemoveOptions): Promise<HAProxyRule>;
    /**
     * Removes one or more HAProxy entities from the repository.
     * 
     * @param entityOrEntities - The HAProxy entity or entities to be removed.
     * @param options - Optional parameters for the removal operation.
     * @returns A promise that resolves to the removed HAProxy entity or entities.
     */
    async remove(entityOrEntities: HAProxyRule | HAProxyRule[], options?: RemoveOptions): Promise<HAProxyRule | HAProxyRule[]> {
        const result = await super.remove(entityOrEntities as HAProxyRule[], options);

        if (result && !Array.isArray(result)) {
            const HAProxyRule = result as HAProxyRule;
            if (HAProxyRule.group) {
                await this.refreshOrders(HAProxyRule.group.id);
            }
        } else if (result && Array.isArray(result) && result.length > 0) {
            const HAProxyRule = result[0] as HAProxyRule;
            if (HAProxyRule.group) {
                await this.refreshOrders(HAProxyRule.group.id);
            }
        }
        return result;
    }

    /**
     * Retrieves the options for finding HAProxy records based on the provided path.
     * 
     * @param path - The partial path object containing the IDs of fwcloud, firewall, and HAProxyg.
     * @param options - The additional options for the find operation.
     * @returns The options for finding HAProxy records.
     */
    protected getFindInPathOptions(path: Partial<IFindOneHAProxyRPath>, options: FindOneOptions<HAProxyRule> | FindManyOptions<HAProxyRule> = {}): FindOneOptions<HAProxyRule> | FindManyOptions<HAProxyRule> {
        return Object.assign({
            join: {
                alias: 'HAProxy',
                innerJoin: {
                    firewall: 'HAProxy.firewall',
                    fwcloud: 'firewall.fwCloud',
                }
            },
            where: (qb: SelectQueryBuilder<HAProxyRule>) => {
                if (path.firewallId) {
                    qb.andWhere('firewall.id = :firewallId', { firewallId: path.firewallId });
                }
                if (path.fwcloudId) {
                    qb.andWhere('fwcloud.id = :fwcloudId', { fwcloudId: path.fwcloudId });
                }
                if (path.haproxyGroupId) {
                    qb.andWhere('group.id = :haproxyGroupId', { haproxyGroupId: path.haproxyGroupId });
                }
                if (path.id) {
                    qb.andWhere('haproxy.id = :id', { id: path.id });
                }
            },
        }, options)
    }

    /**
     * Refreshes the orders of HAProxy rules based on the specified group ID.
     * @param HAProxygid The group ID of the HAProxy rules to refresh.
     * @returns A Promise that resolves when the orders are successfully refreshed.
     */
    protected async refreshOrders(HAProxygid: number): Promise<void> {
        const HAProxy_rs: HAProxyRule[] = await this.find({
            where: {
                group: HAProxygid,
            },
            order: {
                'rule_order': 'ASC',
            },
        });

        let order: number = 1;
        HAProxy_rs.forEach((HAProxy_r: HAProxyRule) => {
            HAProxy_r.rule_order = order++;
        });

        await this.save(HAProxy_rs);
    }

    /**
     * Retrieves the last HAProxy rule in a specified group.
     * @param HAProxygid - The ID of the HAProxy group.
     * @returns A Promise that resolves to the last HAProxy rule in the group.
     */
    async getLastHAProxyRuleInGroup(HAProxygid: number): Promise<HAProxyRule> {
        return (await this.find({
            where: {
                group: HAProxygid,
            },
            order: {
                'rule_order': 'DESC',
            },
            take: 1,
        }))[0];
    }

    async getHAProxyRules(fwcloud: number, firewall: number, rules?: number[],rule_types?: number[]): Promise<HAProxyRule[]> {
        const query: SelectQueryBuilder<HAProxyRule> = this.createQueryBuilder('haproxy_r')
            .leftJoinAndSelect('haproxy_r.group', 'group')
            .leftJoinAndSelect('haproxy_r.frontendIp', 'frontendIp')
            .leftJoinAndSelect('haproxy_r.frontendPort', 'frontendPort')
            .leftJoinAndSelect('haproxy_r.backendIp', 'backendIp')
            .leftJoinAndSelect('haproxy_r.backendPort', 'backendPort')
            .innerJoin('haproxy_r.firewall', 'firewall')
            .innerJoin('firewall.fwCloud', 'fwCloud')
            .where('firewall.id = :firewallId', { firewallId: firewall })
            .andWhere('fwCloud.id = :fwCloudId', { fwCloudId: fwcloud });
        if(rule_types){
            query
                .andWhere('haproxy_r.rule_type IN (:...rule_types)')
                .setParameter('rule_types', rule_types);
        }
        if (rules) {
            query
                .andWhere('haproxy_r.id IN (:...rule)')
                .setParameter('rule', rules);
        }

        return query.orderBy('haproxy_r.rule_order', 'ASC').getMany();
    }
}
