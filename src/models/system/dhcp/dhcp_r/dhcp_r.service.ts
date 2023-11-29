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
import { FindOneOptions, In, getRepository } from "typeorm";
import { DHCPRule } from "./dhcp_r.model";
import { DHCPRepository } from "./dhcp.repository";
import { IPObj } from "../../../ipobj/IPObj";
import { DHCPGroup } from "../dhcp_g/dhcp_g.model";
import { Interface } from "../../../interface/Interface";
import { Offset } from "../../../../offset";
import { Firewall } from "../../../firewall/Firewall";


interface IFindManyDHCPRulePath {
    fwcloudId?: number;
    firewallId?: number;
    dhcpgId?: number;
}

interface IFindOneDHCPRulePath extends IFindManyDHCPRulePath {
    id: number;
}

export interface ICreateDHCPRule {
    active?: boolean;
    groupId: number;
    style?: string;
    networkId?: number;
    rangeId?: number;
    routerId?: number;
    interfaceId?: number;
    max_lease?: number;
    cfg_text?: string;
    comment?: string;
}

export interface IUpdateDHCPRule {
    active?: boolean;
    style?: string;
    networkId?: number;
    rangeId?: number;
    routerId?: number;
    interfaceId?: number;
    max_lease?: number;
    cfg_text?: string;
    comment?: string;
}

export class DHCPRuleService {
    private _repository: DHCPRepository;

    constructor() {
        this._repository = getRepository(DHCPRule) as DHCPRepository;
    }

    async store(data: ICreateDHCPRule): Promise<DHCPRule> {
        const dhcpRuleData: Partial<DHCPRule> = {
            active: data.active,
            style: data.style,
            max_lease: data.max_lease,
            cfg_text: data.cfg_text,
            comment: data.comment,
        };


        if (data.groupId) {
            dhcpRuleData.group = await getRepository(DHCPGroup).findOneOrFail(data.groupId) as DHCPGroup;
        }
        if (data.networkId) {
            dhcpRuleData.network = await getRepository(IPObj).findOneOrFail(data.networkId) as IPObj;
        }
        if(data.rangeId){
            dhcpRuleData.range = await getRepository(IPObj).findOneOrFail(data.rangeId) as IPObj;
        }
        if(data.routerId){
            dhcpRuleData.router = await getRepository(IPObj).findOneOrFail(data.routerId) as IPObj;
        }
        if(data.interfaceId){
            dhcpRuleData.interface = await getRepository(Interface).findOneOrFail(data.interfaceId) as Interface;
        }

        const lastDHCPRule = await this._repository.getLastDHCPRuleInGroup(data.groupId);
        const dhcp_order: number = lastDHCPRule?.rule_order ? lastDHCPRule.rule_order + 1 : 1;

        let persistedDHCPRule: DHCPRule = await this._repository.save(dhcpRuleData);

        return persistedDHCPRule;
    }

    async copy(ids: number[],destRule: number, position: Offset): Promise<DHCPRule[]> {
        const dhcp_rs: DHCPRule[] = await this._repository.find({
            where: {
                id: In(ids),
            },
            relations: ['group', 'group.firewall', 'group.firewall.fwCloud'],
        });
        const lastRule: DHCPRule = await this._repository.getLastDHCPRuleInGroup(dhcp_rs[0].group.id);
        dhcp_rs.map((item,index) => {
            item.id = null;
            item.rule_order = lastRule.rule_order + index + 1;
        });

        const persisted: DHCPRule[] = await this._repository.save(dhcp_rs);

        //TODO: Mark firewall as uncompiled

        return this.move(persisted.map(item => item.id),destRule,position);
    }

    async move(ids: number[], destRule: number, offset: Offset): Promise<DHCPRule[]> {
        const rules: DHCPRule[] = await this._repository.move(ids,destRule,offset);

        //TODO: Mark firewall as uncompiled

        return rules;
    }

    async update(id: number, data: Partial<ICreateDHCPRule>): Promise<DHCPRule> {
        let dhcpRule: DHCPRule = await this._repository.preload(Object.assign({
            active: data.active,
            comment: data.comment,
            sytle: data.style,
            max_lease: data.max_lease,
            cfg_text: data.cfg_text,
        }))

        const firewall: Firewall = (await this._repository.findOne(dhcpRule.id,{relations: ['group','group.firewall']})).group.firewall;

        if(data.groupId){
            dhcpRule.group = await getRepository(DHCPGroup).findOneOrFail(data.groupId) as DHCPGroup;
        }
        if(data.networkId){
            dhcpRule.network = await getRepository(IPObj).findOneOrFail(data.networkId) as IPObj;
        }
        if(data.rangeId){
            dhcpRule.range = await getRepository(IPObj).findOneOrFail(data.rangeId) as IPObj;
        }
        if(data.routerId){
            dhcpRule.router = await getRepository(IPObj).findOneOrFail(data.routerId) as IPObj;
        }
        if(data.interfaceId){
            dhcpRule.interface = await getRepository(Interface).findOneOrFail(data.interfaceId) as Interface;
        }

        dhcpRule = await this._repository.save(dhcpRule);

        //await this.reorderTo(dhcpRule.id);

        //TODO: Mark firewall as uncompiled

        return dhcpRule;
    }

    async remove(path: IFindOneDHCPRulePath): Promise<DHCPRule> {
        const dhcpRule: DHCPRule = await this.findOneInPath(path);

        await this._repository.remove(dhcpRule);

        //TODO: Mark firewall as uncompiled

        return dhcpRule;
    }

    findOneInPath(path: IFindOneDHCPRulePath,options?: FindOneOptions<DHCPRule>): Promise<DHCPRule | undefined> {
        return this._repository.findOneOrFail(this.getFindInPathOptions(path,options));
    }

    findManyInPath(path: IFindManyDHCPRulePath,options?: FindOneOptions<DHCPRule>): Promise<DHCPRule[]> {
        return this._repository.find(this.getFindInPathOptions(path,options));
    }

    protected getFindInPathOptions(path: Partial<IFindOneDHCPRulePath>,options: FindOneOptions<DHCPRule> = {}): FindOneOptions<DHCPRule> {
        return Object.assign({
            join: {
                alias: 'dhcp',
                leftJoinAndSelect: {
                    group: 'dhcp.group',
                }
            },
            where: {
                group: path.dhcpgId,
            }
        },options);
    }
}