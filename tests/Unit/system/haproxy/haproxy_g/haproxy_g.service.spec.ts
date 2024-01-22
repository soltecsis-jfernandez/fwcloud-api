import { getRepository } from "typeorm";
import { Firewall } from "../../../../../src/models/firewall/Firewall";
import { FwCloud } from "../../../../../src/models/fwcloud/FwCloud";
import { HAProxyGroupService } from "../../../../../src/models/system/haproxy/haproxy_g/haproxy_g.service";
import StringHelper from "../../../../../src/utils/string.helper";
import { testSuite } from "../../../../mocha/global-setup";
import sinon from "sinon";
import { expect } from "chai";
import { HAProxyGroup } from "../../../../../src/models/system/haproxy/haproxy_g/haproxy_g.model";
import { IFindOneRoutingRulePath } from "../../../../../src/models/routing/routing-rule/routing-rule.repository";

describe(HAProxyGroupService.name, () => {
    let service: HAProxyGroupService;
    let fwCloud: FwCloud;
    let firewall: Firewall;

    beforeEach(async () => {
        await testSuite.resetDatabaseData();

        service = await testSuite.app.getService<HAProxyGroupService>(HAProxyGroupService.name);

        fwCloud = await getRepository(FwCloud).save(getRepository(FwCloud).create({
            name: StringHelper.randomize(10)
        }));

        firewall = await getRepository(Firewall).save(getRepository(Firewall).create({
            name: StringHelper.randomize(10),
            fwCloudId: fwCloud.id
        }));
    });

    describe('create', () => {

        it('should create a new HAProxyGroup', async () => {
            const data = {
                name: 'group',
                firewallId: firewall.id,
                style: 'default',
            };

            const findOneStub = sinon.stub(getRepository(Firewall), 'findOne').resolves(firewall);
            const saveStub = sinon.stub(service['_repository'], 'save').resolves({ id: 1 } as HAProxyGroup);
            const findOneStub2 = sinon.stub(service['_repository'], 'findOne').resolves({ id: 1 } as HAProxyGroup);

            const result = await service.create(data);

            expect(findOneStub.calledOnce).to.be.true;
            expect(saveStub.calledOnce).to.be.true;
            expect(findOneStub2.calledOnce).to.be.true;
            expect(result).to.deep.equal({ id: 1 });

            findOneStub.restore();
            saveStub.restore();
            findOneStub2.restore();
        });

        it('should handle errors during the creation process', async () => {
            const data = {
                name: 'group',
                firewallId: firewall.id,
                style: 'default',
            };

            const findOneStub = sinon.stub(getRepository(Firewall), 'findOne').resolves(firewall);
            const saveStub = sinon.stub(service['_repository'], 'save').rejects(new Error('Failed to create HAProxyGroup'));

            await expect(service.create(data)).to.be.rejectedWith('Failed to create HAProxyGroup');

            expect(findOneStub.calledOnce).to.be.true;
            expect(saveStub.calledOnce).to.be.true;

            findOneStub.restore();
            saveStub.restore();
        });

        it('should handle errors during the retrieval of the created group', async () => {
            const data = {
                name: 'group',
                firewallId: firewall.id,
                style: 'default',
            };

            const findOneStub = sinon.stub(getRepository(Firewall), 'findOne').resolves(firewall);
            const saveStub = sinon.stub(service['_repository'], 'save').resolves({ id: 1 } as HAProxyGroup);
            const findOneStub2 = sinon.stub(service['_repository'], 'findOne').rejects(new Error('Failed to retrieve HAProxyGroup'));

            await expect(service.create(data)).to.be.rejectedWith('Failed to retrieve HAProxyGroup');

            expect(findOneStub.calledOnce).to.be.true;
            expect(saveStub.calledOnce).to.be.true;
            expect(findOneStub2.calledOnce).to.be.true;

            findOneStub.restore();
            saveStub.restore();
            findOneStub2.restore();
        });
    });
    describe('update', () => {
        let group: HAProxyGroup;

        beforeEach(async () => {
            group = await getRepository(HAProxyGroup).save(getRepository(HAProxyGroup).create({
                name: 'group',
                firewall: firewall,
                style: 'default',
            }));
        });

        it('should update a HAProxyGroup', async () => {
            const id = 1;
            const data = {
                name: 'updated group',
                firewallId: 2,
                style: 'default',
            };

            const saveStub = sinon.stub(service['_repository'], 'save').resolves(group);
            const findOneStub2 = sinon.stub(service['_repository'], 'findOne').resolves(group);

            const result = await service.update(id, data);

            expect(saveStub.calledOnce).to.be.true;
            expect(findOneStub2.calledOnce).to.be.true;
            expect(result).to.deep.equal(await getRepository(HAProxyGroup).findOne(id));

            saveStub.restore();
            findOneStub2.restore();
        });

        it('should throw an error if HAProxyGroup is not found', async () => {
            const id = 1;
            const data = {
                name: 'updated group',
                firewallId: 2,
                style: 'default',
            };

            const findOneStub = sinon.stub(service['_repository'], 'findOne').resolves(undefined);

            await expect(service.update(id, data)).to.be.rejectedWith('HAProxyGroup not found');

            expect(findOneStub.calledOnce).to.be.true;

            findOneStub.restore();
        });

        it('should handle errors during the update process', async () => {
            const id = 1;
            const data = {
                name: 'updated group',
                firewallId: 2,
                style: 'default',
            };

            const findOneStub = sinon.stub(service['_repository'], 'findOne').resolves(group);
            const saveStub = sinon.stub(service['_repository'], 'save').rejects(new Error('Failed to update HAProxyGroup'));

            await expect(service.update(id, data)).to.be.rejectedWith('Failed to update HAProxyGroup');

            expect(findOneStub.calledOnce).to.be.true;
            expect(saveStub.calledOnce).to.be.true;

            findOneStub.restore();
            saveStub.restore();
        });
    });
    describe('remove', () => {
        let group: HAProxyGroup;
        let iFindOneHAProxyGPath: IFindOneRoutingRulePath;

        beforeEach(async () => {
            group = await getRepository(HAProxyGroup).save(getRepository(HAProxyGroup).create({
                name: 'group',
                firewall: firewall,
                style: 'default',
            }));

            iFindOneHAProxyGPath = { id: 1 };
        });

        it('should remove the HAProxyGroup', async () => {
            sinon.stub(service, 'findOneInPath').resolves(group);
            const removeStub = sinon.stub(service['_repository'], 'remove').resolves(group);

            const result = await service.remove(iFindOneHAProxyGPath);

            expect(removeStub.calledOnceWithExactly(group)).to.be.true;
            expect(result).to.deep.equal(group);

            sinon.restore();
        });

        it('should handle errors when the HAProxyGroup is not found', async () => {
            sinon.stub(service, 'findOneInPath').resolves(null);

            await expect(service.remove(iFindOneHAProxyGPath)).to.be.rejectedWith('HAProxyGroup not found');

            sinon.restore();
        });

        it('should handle errors during rules update', async () => {
            sinon.stub(service, 'findOneInPath').resolves(group);
            sinon.stub(service['_repository'], 'remove').rejects(new Error('Failed to remove HAProxyGroup'));

            await expect(service.remove(iFindOneHAProxyGPath)).to.be.rejectedWith('Failed to remove HAProxyGroup');

            sinon.restore();
        });

        it('should handle errors during the group removal', async () => {
            sinon.stub(service, 'findOneInPath').rejects(new Error('Failed to find HAProxyGroup'));
            sinon.stub(service['_repository'], 'remove').resolves(group);

            await expect(service.remove(iFindOneHAProxyGPath)).to.be.rejectedWith('Failed to find HAProxyGroup');

            sinon.restore();
        });
    });
});