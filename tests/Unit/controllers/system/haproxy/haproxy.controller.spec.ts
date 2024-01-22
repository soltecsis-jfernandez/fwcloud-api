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
import { Application } from "../../../../../src/Application";
import { getRepository } from "typeorm";
import { HAProxyController } from "../../../../../src/controllers/system/haproxy/haproxy.controller";
import { Firewall } from "../../../../../src/models/firewall/Firewall";
import { FwCloud } from "../../../../../src/models/fwcloud/FwCloud";
import { HAProxyGroup } from "../../../../../src/models/system/haproxy/haproxy_g/haproxy_g.model";
import { HAProxyRule } from "../../../../../src/models/system/haproxy/haproxy_r/haproxy_r.model";
import { testSuite } from "../../../../mocha/global-setup";
import { Request } from 'express';
import StringHelper from "../../../../../src/utils/string.helper";
import sinon from "sinon";

describe(HAProxyController.name, () => {
    let firewall: Firewall;
    let fwCloud: FwCloud;
    let haproxyGroup: HAProxyGroup;
    let haproxyRule: HAProxyRule;

    let controller: HAProxyController;
    let app: Application;

    beforeEach(async () => {
        app = testSuite.app;
        await testSuite.resetDatabaseData();

        controller = new HAProxyController(app);

        fwCloud = await getRepository(FwCloud).save(getRepository(FwCloud).create({
            name: StringHelper.randomize(10)
        }));

        firewall = await getRepository(Firewall).save(getRepository(Firewall).create({
            name: StringHelper.randomize(10),
            fwCloudId: fwCloud.id
        }));

        haproxyGroup = await getRepository(HAProxyGroup).save({
            name: StringHelper.randomize(10),
            firewall: firewall,
        });

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
    });

    describe('make', () => {
        it('should fetch HAProxyRule and HAProxyGroup when HAProxy param is present', async () => {
            const requestMock = {
                params: {
                    haproxy: haproxyRule.id,
                    firewall: firewall.id,
                    fwcloud: fwCloud.id
                }
            } as unknown as Request;

            const HAProxyruleStub = sinon.stub(getRepository(HAProxyRule), 'findOneOrFail').resolves(haproxyRule);
            const firewallStub = sinon.stub(getRepository(Firewall), 'findOneOrFail').resolves(firewall);
            const fwCloudStub = sinon.stub(getRepository(FwCloud), 'findOneOrFail').resolves(fwCloud);

            await controller.make(requestMock);

            expect(HAProxyruleStub.calledOnce).to.be.true;
            expect(firewallStub.calledOnce).to.be.true;
            expect(fwCloudStub.calledOnce).to.be.true;

            HAProxyruleStub.restore();
            firewallStub.restore();
            fwCloudStub.restore();
        });

        it('should not fetch HAProxyRule and HAProxyGroup when HAProxy param is not present', async () => {
            const requestMock = {
                params: {
                    firewall: firewall.id,
                    fwcloud: fwCloud.id
                }
            } as unknown as Request;

            const HAProxyruleStub = sinon.stub(getRepository(HAProxyRule), 'findOneOrFail');
            const HAProxygroupStub = sinon.stub(getRepository(HAProxyGroup), 'findOneOrFail');
            const firewallStub = sinon.stub(getRepository(Firewall), 'findOneOrFail');
            const fwCloudStub = sinon.stub(getRepository(FwCloud), 'findOneOrFail');

            await controller.make(requestMock);

            expect(HAProxyruleStub.called).to.be.false;
            expect(HAProxygroupStub.called).to.be.false;
            expect(firewallStub.calledOnce).to.be.true;
            expect(fwCloudStub.calledOnce).to.be.true;

            HAProxyruleStub.restore();
            HAProxygroupStub.restore();
            firewallStub.restore();
            fwCloudStub.restore();
        });

        it('should handle errors when entities are not found', async () => {
            const requestMock = {
                params: {
                    HAProxy: 999, // non-existent HAProxy id
                    firewall: firewall.id,
                    fwcloud: fwCloud.id
                }
            } as unknown as Request;

            const HAProxyruleStub = sinon.stub(getRepository(HAProxyRule), 'findOneOrFail').throws(new Error('HAProxyRule not found'));

            await expect(controller.make(requestMock)).to.be.rejectedWith('HAProxyRule not found');

            HAProxyruleStub.restore();
        });

        it('should fetch Firewall and FwCloud', async () => {
            const requestMock = {
                params: {
                    firewall: firewall.id,
                    fwcloud: fwCloud.id
                }
            } as unknown as Request;

            const firewallStub = sinon.stub(getRepository(Firewall), 'findOneOrFail').resolves(firewall);
            const fwCloudStub = sinon.stub(getRepository(FwCloud), 'findOneOrFail').resolves(fwCloud);

            await controller.make(requestMock);

            expect(firewallStub.calledOnce).to.be.true;
            expect(fwCloudStub.calledOnce).to.be.true;

            firewallStub.restore();
            fwCloudStub.restore();
        });
    });
});