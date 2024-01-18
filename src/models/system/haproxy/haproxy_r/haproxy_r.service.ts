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
import { FindOneOptions, In, SelectQueryBuilder, getCustomRepository, getRepository } from "typeorm";
import { HAProxyRule } from "./haproxy_r.model";
import { HAProxyRepository } from "./haproxy.repository";
import { IPObj } from "../../../ipobj/IPObj";
import { HAProxyGroup } from "../haproxy_g/haproxy_g.model";
import { Interface } from "../../../interface/Interface";
import { Offset } from "../../../../offset";
import { Application } from "../../../../Application";
import { Service } from "../../../../fonaments/services/service";
import { IPObjRepository } from "../../../ipobj/IPObj.repository";
import { IPObjGroup } from "../../../ipobj/IPObjGroup";
import { AvailableDestinations, HAProxyRuleItemForCompiler, HAProxyUtils, ItemForGrid } from "../../shared";
import { Firewall } from "../../../firewall/Firewall";


interface IFindManyHAProxyRulePath {
    fwcloudId?: number;
    firewallId?: number;
}

interface IFindOneHAProxyRulePath extends IFindManyHAProxyRulePath {
    id: number;
}

export interface ICreateHAProxyRule {
    active?: boolean;
    groupId?: number;
    style?: string;
    firewallId?: number;
    frontendIpId?: number;
    frontendPortId?: number;
    backendIpId?: number;
    backendPortId?: number;
    comment?: string;
    rule_order?: number;
    to?: number;
    offset?: Offset;
}

export interface IUpdateHAProxyRule {
    active?: boolean;
    style?: string;
    frontendIpId?: number;
    frontendPortId?: number;
    backendIpId?: number;
    backendPortId?: number;
    comment?: string;
    rule_order?: number;
    group?: number;
}

//TODO: Need to add the data type HAProxyRuleItemForCompile
export interface HAProxyRulesData<T extends ItemForGrid | HAProxyRuleItemForCompiler> extends HAProxyRule {
    items: (T & { _order: number })[];
}

export class HAProxyRuleService extends Service {
    private _repository: HAProxyRepository;
    private _ipobjRepository: IPObjRepository;
    private _haproxyRangeRepository: IPObjRepository;
    private _routerRepository: IPObjRepository;

    constructor(app: Application) {
        super(app)
        this._repository = getCustomRepository(HAProxyRepository);
        this._ipobjRepository = getCustomRepository(IPObjRepository);
        this._haproxyRangeRepository = getCustomRepository(IPObjRepository);
        this._routerRepository = getCustomRepository(IPObjRepository);
    }
//TODO: REVISAR CAMPOS
    async store(data: ICreateHAProxyRule): Promise<HAProxyRule> {
        const HAProxyRuleData: Partial<HAProxyRule> = {
            active: data.active,
            style: data.style,
            comment: data.comment,
        };

        if (data.groupId) {
            HAProxyRuleData.group = await getRepository(HAProxyGroup).findOneOrFail(data.groupId) as HAProxyGroup;
        }
        if (data.frontendIpId) {
            HAProxyRuleData.frontendIp = await getRepository(IPObj).findOneOrFail(data.frontendIpId) as IPObj;
        }
        if (data.frontendPortId) {
            HAProxyRuleData.frontendPort = await getRepository(IPObj).findOneOrFail(data.frontendPortId) as IPObj;
        }
        if (data.backendIpId) {
            HAProxyRuleData.backendIp = await getRepository(IPObj).findOneOrFail(data.backendIpId) as IPObj;
        }
        if (data.backendPortId) {
            HAProxyRuleData.backendPort = await getRepository(IPObj).findOneOrFail(data.backendPortId) as IPObj;
        }
        if (data.firewallId) {
            HAProxyRuleData.firewall = await getRepository(Firewall).findOneOrFail(data.firewallId) as Firewall;
        }

        const lastHAProxyRule = await this._repository.getLastHAProxyRuleInGroup(data.groupId);
        HAProxyRuleData.rule_order = lastHAProxyRule?.rule_order ? lastHAProxyRule.rule_order + 1 : 1;

        const persisted = await this._repository.save(HAProxyRuleData);

        if (Object.prototype.hasOwnProperty.call(data, 'to') && Object.prototype.hasOwnProperty.call(data, 'offset')) {
            return (await this.move([persisted.id], data.to, data.offset))[0]
        }

        return persisted;
    }

    async copy(ids: number[], destRule: number, position: Offset): Promise<HAProxyRule[]> {
        const HAProxy_rs: HAProxyRule[] = await this._repository.find({
            where: {
                id: In(ids),
            },
            relations: ['group', 'firewall', 'firewall.fwCloud'],
        });

        const savedCopies: HAProxyRule[] = await Promise.all(
            HAProxy_rs.map(async rule => {
                const { id, ...copy } = rule;
                return await this._repository.save({ ...copy });
            })
        );
        //TODO: Mark firewall as uncompiled
        return this.move(savedCopies.map(item => item.id), destRule, position);
    }

    async move(ids: number[], destRule: number, offset: Offset): Promise<HAProxyRule[]> {
        //TODO: Mark firewall as uncompiled

        return await this._repository.move(ids, destRule, offset);
    }

    async update(id: number, data: Partial<ICreateHAProxyRule>): Promise<HAProxyRule> {
        const HAProxyRule: HAProxyRule | undefined = await this._repository.findOne(id);

        if (!HAProxyRule) {
            throw new Error('HAProxyRule not found');
        }

        Object.assign(HAProxyRule, {
            active: data.active !== undefined ? data.active : HAProxyRule.active,
            comment: data.comment !== undefined ? data.comment : HAProxyRule.comment,
            style: data.style !== undefined ? data.style : HAProxyRule.style,
            rule_order: data.rule_order !== undefined ? data.rule_order : HAProxyRule.rule_order
        });

        const fieldsToUpdate = ['frontendIpId', 'frontendPortId', 'backendIpId', 'backendPortId', 'firewallId'];

        for (const field of fieldsToUpdate) {
            if (data[field]) {
                HAProxyRule[field.slice(0, -2)] = await getRepository(field === 'firewallId' ? Firewall : IPObj).findOneOrFail(data[field]) as Firewall | IPObj;
            }
        }

        await this._repository.save(HAProxyRule);

        // await this.reorderTo(HAProxyRule.id);

        // TODO: Marcar el firewall como no compilado

        return HAProxyRule;
    }

    async remove(path: IFindOneHAProxyRulePath): Promise<HAProxyRule> {
        const HAProxyRule: HAProxyRule = await this.findOneInPath(path);

        await this._repository.remove(HAProxyRule);

        //TODO: Mark firewall as uncompiled

        return HAProxyRule;
    }

    findOneInPath(path: IFindOneHAProxyRulePath, options?: FindOneOptions<HAProxyRule>): Promise<HAProxyRule | undefined> {
        return this._repository.findOneOrFail(this.getFindInPathOptions(path, options));
    }

    findManyInPath(path: IFindManyHAProxyRulePath, options?: FindOneOptions<HAProxyRule>): Promise<HAProxyRule[]> {
        return this._repository.find(this.getFindInPathOptions(path, options));
    }

    protected getFindInPathOptions(path: Partial<IFindOneHAProxyRulePath>, options: FindOneOptions<HAProxyRule> = {}): FindOneOptions<HAProxyRule> {
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
                if (path.id) {
                    qb.andWhere('HAProxy.id = :id', { id: path.id });
                }
            },
        }, options);
    }

    //TODO: Need to add the data type HAProxyRuleItemForCompile
    public async getHAProxyRulesData<T extends ItemForGrid | HAProxyRuleItemForCompiler>(dst: AvailableDestinations, fwcloud: number, firewall: number, rules?: number[]): Promise<HAProxyRulesData<T>[]> {
        let rulesData: HAProxyRulesData<T>[];
        switch (dst) {
            case 'haproxy_grid':
                rulesData = await this._repository.getHAProxyRules(fwcloud, firewall, rules, [1]) as HAProxyRulesData<T>[];
                break;
            case 'compiler':
                rulesData = await this._repository.getHAProxyRules(fwcloud, firewall, rules) as HAProxyRulesData<T>[];
                break;
        }

        const ItemsArrayMap = new Map<number, T[]>();
        for (const rule of rulesData) {
            ItemsArrayMap.set(rule.id, rule.items);
        }
/* //TODO: REVISAR COMPILER
        const sqls = (dst === 'compiler') ?
            this.buildHAProxyRulesCompilerSql(fwcloud, firewall, rules) : 
            this.getHAProxyRulesGridSql(fwcloud, firewall, rules);

        const result = await Promise.all(sqls.map(sql => HAProxyUtils.mapEntityData<T>(sql, ItemsArrayMap)));
*/
        return rulesData.map(rule => {
            if (rule.items) {
                rule.items = rule.items.sort((a, b) => a._order - b._order);
            }
            return rule;
        });
    }

    public async bulkUpdate(ids: number[], data: IUpdateHAProxyRule): Promise<HAProxyRule[]> {
        await this._repository.update({
            id: In(ids),
        }, { ...data, group: { id: data.group } });

        //TODO: Mark firewall as uncompiled
        /*const firewallIds: number[] = (await this._repository.find({
            where: {
                id: In(ids),
            },
            join: {
                alias: 'HAProxy_r',
            }
        })).map(item => item.firewall.id);*/

        return this._repository.find({
            where: {
                id: In(ids),
            }
        });
    }

    public async bulkRemove(ids: number[]): Promise<HAProxyRule[]> {
        const rules: HAProxyRule[] = await this._repository.find({
            where: {
                id: In(ids),
            },
        });

        for (let rule of rules) {
            await this.remove({ id: rule.id });
        }

        return rules;
    }
/* //TODO: REVISAR FUNCIONES
    private getHAProxyRulesGridSql(fwcloud: number, firewall: number, rules?: number[]): SelectQueryBuilder<IPObj | IPObjGroup>[] {
        return [
            this._ipobjRepository.getIpobjsInHAProxy_ForGrid('haproxy_r', fwcloud, firewall),
            this._HAProxyRangeRepository.getHAProxyRangesInHAProxy_ForGrid('haproxy_r', fwcloud, firewall),
            this._routerRepository.getRoutersInHAProxy_ForGrid('haproxy_r', fwcloud, firewall),
        ];
    }

    private buildHAProxyRulesCompilerSql(fwcloud: number, firewall: number, rules?: number[]): SelectQueryBuilder<IPObj | IPObjGroup>[] {
        return [
            this._ipobjRepository.getIpobjsInHAProxy_ForGrid('haproxy_r', fwcloud, firewall),
            this._HAProxyRangeRepository.getHAProxyRangesInHAProxy_ForGrid('haproxy_r', fwcloud, firewall),
            this._routerRepository.getRoutersInHAProxy_ForGrid('haproxy_r', fwcloud, firewall),
        ];
    }*/
}
