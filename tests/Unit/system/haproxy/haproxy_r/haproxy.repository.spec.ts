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
import { getCustomRepository } from "typeorm";
import { HAProxyRule } from "../../../../../src/models/system/haproxy/haproxy_r/haproxy_r.model";
import { HAProxyRepository } from "../../../../../src/models/system/haproxy/haproxy_r/haproxy.repository";
import { HAProxyGroup } from "../../../../../src/models/system/haproxy/haproxy_g/haproxy_g.model";
import { IPObj } from "../../../../../src/models/ipobj/IPObj";
import { getRepository } from "typeorm";
import { Firewall } from "../../../../../src/models/firewall/Firewall";
import { testSuite, expect } from "../../../../mocha/global-setup";
import { FwCloud } from "../../../../../src/models/fwcloud/FwCloud";
import StringHelper from "../../../../../src/utils/string.helper";
import sinon from "sinon";
import { Offset } from "../../../../../src/offset";

describe(HAProxyRepository.name, () => {
    let repository: HAProxyRepository;
    let fwCloud: FwCloud;
    let firewall: Firewall;
    let gateway: IPObj;
    let group: HAProxyGroup;
    let haproxyRule: HAProxyRule;

    beforeEach(async () => {
        await testSuite.resetDatabaseData();
        repository = getCustomRepository(HAProxyRepository);
        fwCloud = await getRepository(FwCloud).save(getRepository(FwCloud).create({
            name: StringHelper.randomize(10)
        }));
        firewall = await getRepository(Firewall).save(getRepository(Firewall).create({
            name: StringHelper.randomize(10),
            fwCloudId: fwCloud.id
        }));
        gateway = await getRepository(IPObj).save(getRepository(IPObj).create({
            name: 'test',
            address: '0.0.0.0',
            ipObjTypeId: 0,
        }));

        group = await getRepository(HAProxyGroup).save(getRepository(HAProxyGroup).create({
            name: 'group',
            firewall: firewall,
        }));

        haproxyRule = await getRepository(HAProxyRule).save(getRepository(HAProxyRule).create({
            group: group,
            firewall: firewall,
            rule_order: 1,
        }));
    });

    describe('remove', () => {
        it('should remove a single HAProxyRule entity', async () => {
            const result = await repository.remove(haproxyRule);

            expect(result).to.deep.equal(HAProxyRule);
            expect(await repository.findOne(haproxyRule.id)).to.be.undefined;
        });

        it('should remove multiple HAProxyRule entities', async () => {
            const haproxyRule2 = await getRepository(HAProxyRule).save(getRepository(HAProxyRule).create({
                group: group,
                firewall: firewall,
                rule_order: 2,
            }));

            const result = await repository.remove([haproxyRule, haproxyRule2]);

            expect(result).to.deep.equal([HAProxyRule, haproxyRule2]);
            expect(await repository.findOne(haproxyRule.id)).to.be.undefined;
            expect(await repository.findOne(haproxyRule2.id)).to.be.undefined;
        });

        it('should refresh orders after remove', async () => {
            const refreshOrdersSpy = sinon.spy(repository, 'refreshOrders' as keyof HAProxyRepository);

            await repository.remove(haproxyRule);

            expect(refreshOrdersSpy.calledOnceWithExactly(group.id)).to.be.true;
        });
    });

    describe('move', () => {
        it('should move the rule to the specified position', async () => {
            haproxyRule.group = null;
            haproxyRule.save();

            const moveAboveSpy = sinon.spy(repository, 'moveAbove' as keyof HAProxyRepository);

            await repository.move([haproxyRule.id], haproxyRule.id, Offset.Above);

            expect(moveAboveSpy.calledOnce).to.be.true;
        });

        it('should refresh orders after move', async () => {
            const refreshOrdersSpy = sinon.spy(repository, 'refreshOrders' as keyof HAProxyRepository);

            await repository.move([haproxyRule.id], haproxyRule.id, Offset.Above);

            expect(refreshOrdersSpy.calledOnce).to.be.true;
        });
    });

    describe('getLastHAProxyRuleInGroup', () => {
        it('should return the last HAProxy rule in the group', async () => {
            const HAProxygid = group.id;
            const expectedRule: HAProxyRule = await getRepository(HAProxyRule).save(getRepository(HAProxyRule).create({
                group: group,
                firewall: firewall,
                rule_order: 2,
            }));

            const result = await repository.getLastHAProxyRuleInGroup(HAProxygid);

            // Assert
            expect(result.id).to.equal(expectedRule.id);
            expect(result.rule_order).to.equal(expectedRule.rule_order);
            expect(result.rule_type).to.equal(expectedRule.rule_type);
        });
    });
});
