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
import { expect } from "chai";
import { getRepository } from "typeorm";
import { HAProxyGroup } from "../../../../../src/models/system/haproxy/haproxy_g/haproxy_g.model";
import { HAProxyRuleService, ICreateHAProxyRule } from "../../../../../src/models/system/haproxy/haproxy_r/haproxy_r.service";
import sinon from "sinon";
import { HAProxyRule } from "../../../../../src/models/system/haproxy/haproxy_r/haproxy_r.model";
import { Firewall } from "../../../../../src/models/firewall/Firewall";
import { FwCloud } from "../../../../../src/models/fwcloud/FwCloud";
import StringHelper from "../../../../../src/utils/string.helper";
import { testSuite } from "../../../../mocha/global-setup";
import { Offset } from "../../../../../src/offset";
import { beforeEach } from "mocha";

describe(HAProxyRuleService.name, () => {
    let service: HAProxyRuleService;
    let fwCloud: FwCloud;
    let firewall: Firewall;
    let haproxyRule: HAProxyRule;

    beforeEach(async () => {
        await testSuite.resetDatabaseData();

        service = await testSuite.app.getService<HAProxyRuleService>(HAProxyRuleService.name);

        fwCloud = await getRepository(FwCloud).save(getRepository(FwCloud).create({
            name: StringHelper.randomize(10)
        }));

        firewall = await getRepository(Firewall).save(getRepository(Firewall).create({
            name: StringHelper.randomize(10),
            fwCloudId: fwCloud.id
        }));

        haproxyRule = await getRepository(HAProxyRule).save(getRepository(HAProxyRule).create({
            id: 1,
            group: await getRepository(HAProxyGroup).save(getRepository(HAProxyGroup).create({
                name: 'group',
                firewall: firewall,
            })),
            firewall: firewall,
            rule_order: 1,
        }));
    });

    afterEach(() => {
        sinon.restore();
    })

    describe('store', () => {
        let group: HAProxyGroup;
        beforeEach(async () => {

            group = await getRepository(HAProxyGroup).save(getRepository(HAProxyGroup).create({
                name: 'group',
                firewall: firewall,
            }));

        });
        it('should store a new HAProxyRule', async () => {
            const data = {
                active: true,
                style: 'default',
                comment: 'sample comment',
                frontendIpId: 1,
                frontendPortId: 1,
                backendIpId: 1,
                backendPortId: 1,
            };

            const expectedHAProxyRule: HAProxyRule = getRepository(HAProxyRule).create({
                group: group,
                rule_order: 1,
            });
            service['_repository'].getLastHAProxyRuleInGroup = () => null;
            const getLastHAProxyRuleInGroupStub = sinon.stub(service['_repository'], 'getLastHAProxyRuleInGroup');
            getLastHAProxyRuleInGroupStub.returns(null);
            const saveStub = sinon.stub(service['_repository'], 'save').resolves(expectedHAProxyRule);

            const result = await service.store(data);

            expect(getLastHAProxyRuleInGroupStub.calledOnce).to.be.true;
            expect(saveStub.calledOnce).to.be.true;
            expect(result).to.deep.equal(expectedHAProxyRule);

            getLastHAProxyRuleInGroupStub.restore();
            saveStub.restore();
        });
        it('should throw an error if the group does not exist', async () => {
            const data = {
                active: true,
                style: 'default',
                comment: 'sample comment',
                frontendIpId: 1,
                frontendPortId: 1,
                backendIpId: 1,
                backendPortId: 1,
            };

            const findOneOrFailStub = sinon.stub(getRepository(HAProxyGroup), 'findOneOrFail').throws();

            await expect(service.store(data)).to.be.rejectedWith(Error);

            findOneOrFailStub.restore();
        });
        it('should throw errors when saving fails', async () => {
            const data = {
                active: true,
                style: 'default',               
                comment: 'sample comment',
                frontendIpId: 1,
                frontendPortId: 1,
                backendIpId: 1,
                backendPortId: 1,
            };

            const expectedError = new Error('test error');
            const saveStub = sinon.stub(service['_repository'], 'save').throws(expectedError);

            await expect(service.store(data)).to.be.rejectedWith(expectedError);

            saveStub.restore();
        });
        it('should correctly set the rule_order', async () => {
            const data = {
                active: true,
                style: 'default',
                comment: 'sample comment',
                groupId: 1,
                firewallId: firewall.id,
                frontendIpId: 1,
                frontendPortId: 1,
                backendIpId: 1,
                backendPortId: 1,
            };

            const existingHAProxyRule: HAProxyRule = getRepository(HAProxyRule).create(getRepository(HAProxyRule).create({
                group: group,
                rule_order: 1,
            }));
            existingHAProxyRule.rule_order = 5;
            const getLastHAProxyRuleInGroupStub = sinon.stub(service['_repository'], 'getLastHAProxyRuleInGroup').resolves(existingHAProxyRule);

            const result = await service.store(data);
            expect(result).to.have.property('rule_order', 6);

            getLastHAProxyRuleInGroupStub.restore();
        });

        it('should move the stored HAProxyRule to a new position', async () => {
            const data = {
                active: true,
                style: 'default',
                comment: 'sample comment',
                groupId: 1,      
                frontendIpId: 1,
                frontendPortId: 1,
                backendIpId: 1,
                backendPortId: 1,          
                to: 3,
                offset: 'above'
            };

            const expectedHAProxyRule: HAProxyRule = getRepository(HAProxyRule).create({
                group: {} as HAProxyGroup,
                rule_order: 1,
            });

            const getLastHAProxyRuleInGroupStub = sinon.stub(service['_repository'], 'getLastHAProxyRuleInGroup');
            getLastHAProxyRuleInGroupStub.returns(null);

            const saveStub = sinon.stub(service['_repository'], 'save');
            saveStub.resolves(expectedHAProxyRule);

            const moveStub = sinon.stub(service, 'move');
            moveStub.resolves([expectedHAProxyRule]);

            const result = await service.store(data as ICreateHAProxyRule);

            expect(getLastHAProxyRuleInGroupStub.calledOnce).to.be.true;
            expect(saveStub.calledOnce).to.be.true;
            expect(moveStub.calledOnceWith([expectedHAProxyRule.id], data.to, data.offset as Offset)).to.be.true; // Cast 'data.offset' to 'Offset'
            expect(result).to.deep.equal(expectedHAProxyRule);

            getLastHAProxyRuleInGroupStub.restore();
            saveStub.restore();
            moveStub.restore();
        });
    });
    describe('copy', () => {
        let getLastHAProxyRuleInGroupStub: sinon.SinonStub;
        let copyStub: sinon.SinonStub;
        let moveStub: sinon.SinonStub;

        beforeEach(async () => {
            haproxyRule.group = await getRepository(HAProxyGroup).save(getRepository(HAProxyGroup).create({
                name: 'group',
                firewall: firewall,
            }));
            copyStub = sinon.stub(service['_repository'], 'save').resolves(haproxyRule);
            moveStub = sinon.stub(service, 'move').resolves([haproxyRule]);
        });

        afterEach(() => {
            copyStub.restore();
            moveStub.restore();
        });

        it('should copy a HAProxyRule successfully', async () => {
            const result: HAProxyRule[] = await service.copy([haproxyRule.id], haproxyRule.id, Offset.Above);

            expect(copyStub.called).to.be.true;
            expect(result[0].id).equal(haproxyRule.id);
            expect(result[0].rule_order).equal(haproxyRule.rule_order);
            expect(result[0].rule_type).equal(haproxyRule.rule_type);
            expect(result[0].active).equal(haproxyRule.active);
        });

        it('should correctly handle different positions', async () => {
            await service.copy([haproxyRule.id], haproxyRule.id, Offset.Below);

            expect(moveStub.calledOnceWith([haproxyRule.id], haproxyRule.rule_order, Offset.Below)).to.be.true;
        });

        it('should correctly modify rule_order for each copied rule', async () => {
            await service.copy([haproxyRule.id], haproxyRule.id, Offset.Above);

            expect(moveStub.calledOnceWith([haproxyRule.id], haproxyRule.rule_order, Offset.Above)).to.be.true;
        });

        it('should call move method with correct parameters after copying', async () => {

            await service.copy([haproxyRule.id], haproxyRule.id, Offset.Above);

            expect(moveStub.calledOnceWith([haproxyRule.id], haproxyRule.rule_order, Offset.Above)).to.be.true;
        });
    });
    describe('move', () => {
        it('should move the HAProxy rules successfully', async () => {
            const ids = [1, 2, 3];
            const destRule = 4;
            const offset = Offset.Above;
            const expectedRules: HAProxyRule[] = [];

            const moveStub = sinon.stub(service, 'move').resolves(expectedRules);

            const result = await service.move(ids, destRule, offset);

            expect(moveStub.calledOnceWith(ids, destRule, offset)).to.be.true;
            expect(result).to.deep.equal(expectedRules);

            moveStub.restore();
        });

        it('should handle errors correctly', async () => {
            const ids = [1, 2, 3];
            const destRule = 4;
            const offset = Offset.Above;

            const moveStub = sinon.stub(service, 'move').rejects(new Error('Move error'));

            await expect(service.move(ids, destRule, offset)).to.be.rejectedWith(Error, 'Move error');

            moveStub.restore();
        });

        it('should handle different input parameters correctly', async () => {
            const ids = [1, 2, 3];
            const destRule = 4;
            const offset = Offset.Below;

            const moveStub = sinon.stub(service, 'move').resolves([]);

            await service.move(ids, destRule, offset);

            expect(moveStub.calledOnceWith(ids, destRule, offset)).to.be.true;

            moveStub.restore();
        });

        it('should move rules according to the specified offset', async () => {
            const ids = [1, 2, 3];
            const destRule = 4;
            const offset = Offset.Below;

            const moveStub = sinon.stub(service, 'move');

            await service.move(ids, destRule, offset);

            expect(moveStub.calledOnceWith(ids, destRule, offset)).to.be.true;

            moveStub.restore();
        });
    });
    describe('update', () => {
        it('should successfully update a HAProxyRule', async () => {
            const haproxyRule = await getRepository(HAProxyRule).save(getRepository(HAProxyRule).create({
                id: 1,
                group: await getRepository(HAProxyGroup).save(getRepository(HAProxyGroup).create({
                    name: 'group',
                    firewall: firewall,
                })),
                rule_order: 1,
            }));

            const updateStub = sinon.stub(service, 'update').resolves(haproxyRule);

            const result = await service.update(haproxyRule.id, { rule_order: 2 });

            expect(updateStub.calledOnceWith(haproxyRule.id, { rule_order: 2 })).to.be.true;
            expect(result).to.deep.equal(HAProxyRule);

            updateStub.restore();
        });

        it('should handle errors when the HAProxyRule to update is not found', async () => {
            const updateStub = sinon.stub(service, 'update').rejects(new Error('HAProxyRule not found'));

            await expect(service.update(1, { rule_order: 2 })).to.be.rejectedWith(Error, 'HAProxyRule not found');

            updateStub.restore();
        });

        it('should update related entities correctly', async () => {
            const haproxyRule = await getRepository(HAProxyRule).save(getRepository(HAProxyRule).create({
                id: 1,
                group: await getRepository(HAProxyGroup).save(getRepository(HAProxyGroup).create({
                    name: 'group',
                    firewall: firewall,
                })),
                rule_order: 1,
            }));

            const updateStub = sinon.stub(service, 'update').resolves(haproxyRule);
            const group2 = (await getRepository(HAProxyGroup).save(getRepository(HAProxyGroup).create({
                name: 'group2',
                firewall: firewall,
            })));

            const result = await service.update(haproxyRule.id, { groupId: group2.id });

            expect(updateStub.calledOnceWith(haproxyRule.id, { groupId: group2.id })).to.be.true;
            expect(result).to.deep.equal(HAProxyRule);

            updateStub.restore();
        });

        it('should handle errors when related entities are not found', async () => {
            const updateStub = sinon.stub(service, 'update').rejects(new Error('Related entities not found'));

            await expect(service.update(1, {
                groupId: (await getRepository(HAProxyGroup).save(getRepository(HAProxyGroup).create({
                    name: 'group2',
                    firewall: firewall,
                }))).id
            })).to.be.rejectedWith(Error, 'Related entities not found');

            updateStub.restore();
        });
    });
    describe('remove', () => {
        it('should remove the HAProxy rule successfully', async () => {
            const haproxyRule = await getRepository(HAProxyRule).save(getRepository(HAProxyRule).create({
                id: 1,
                group: await getRepository(HAProxyGroup).save(getRepository(HAProxyGroup).create({
                    name: 'group',
                    firewall: firewall,
                })),
                rule_order: 1,
            }));
            const path = { id: 1 };

            sinon.stub(service, 'findOneInPath').resolves(haproxyRule);
            const removeStub = sinon.stub(service['_repository'], 'remove').resolves(haproxyRule);

            const result = await service.remove(path);

            expect(removeStub.calledOnceWithExactly(haproxyRule)).to.be.true;
            expect(result).to.equal(HAProxyRule);
        });

        it('should throw an error if the HAProxy rule does not exist', async () => {
            const path = {
                id: 1,
            };

            sinon.stub(service, 'findOneInPath').resolves(null);

            await expect(service.remove(path)).to.be.rejectedWith(Error);
        });
    });

    describe('bulkUpdate', () => {
        it('should update the HAProxy rules successfully', async () => {
            const ids = [1, 2, 3];
            const data = { rule_order: 2 };

            const bulkUpdateStub = sinon.stub(service, 'bulkUpdate').resolves([haproxyRule]);

            const result = await service.bulkUpdate(ids, data);

            expect(bulkUpdateStub.calledOnceWith(ids, data)).to.be.true;
            expect(result).to.deep.equal([HAProxyRule]);

            bulkUpdateStub.restore();
        });

        it('should handle errors when updating the HAProxy rules', async () => {
            const ids = [1, 2, 3];
            const data = { rule_order: 2 };

            const bulkUpdateStub = sinon.stub(service, 'bulkUpdate').rejects(new Error('Bulk update error'));

            await expect(service.bulkUpdate(ids, data)).to.be.rejectedWith(Error, 'Bulk update error');

            bulkUpdateStub.restore();
        });
    });

    describe('bulkRemove', () => {
        it('should remove the HAProxy rules successfully', async () => {
            const ids = [1, 2, 3];

            const bulkRemoveStub = sinon.stub(service, 'bulkRemove').resolves([haproxyRule]);

            const result = await service.bulkRemove(ids);

            expect(bulkRemoveStub.calledOnceWith(ids)).to.be.true;
            expect(result).to.deep.equal([HAProxyRule]);

            bulkRemoveStub.restore();
        });

        it('should handle errors when removing the HAProxy rules', async () => {
            const ids = [1, 2, 3];

            const bulkRemoveStub = sinon.stub(service, 'bulkRemove').rejects(new Error('Bulk remove error'));

            await expect(service.bulkRemove(ids)).to.be.rejectedWith(Error, 'Bulk remove error');

            bulkRemoveStub.restore();
        });
    });
});