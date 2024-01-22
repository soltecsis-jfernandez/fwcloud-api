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

import { Application } from "../../../../../src/Application";
import { getRepository } from "typeorm";
import { HAProxyGroupController } from "../../../../../src/controllers/system/haproxy-group/haproxy-group.controller";
import { Firewall } from "../../../../../src/models/firewall/Firewall";
import { FwCloud } from "../../../../../src/models/fwcloud/FwCloud";
import { HAProxyGroup } from "../../../../../src/models/system/haproxy/haproxy_g/haproxy_g.model";
import StringHelper from "../../../../../src/utils/string.helper";
import { testSuite } from "../../../../mocha/global-setup";
import sinon from "sinon";
import { Request } from 'express';
import { expect } from "chai";
import { HAProxyGroupService } from "../../../../../src/models/system/haproxy/haproxy_g/haproxy_g.service";

describe(HAProxyGroupController.name, () => {
    let firewall: Firewall;
    let fwCloud: FwCloud;
    let HAProxygroup: HAProxyGroup;

    let controller: HAProxyGroupController;
    let app: Application;

    beforeEach(async () => {
        app = testSuite.app;
        await testSuite.resetDatabaseData();

        controller = new HAProxyGroupController(app);

        fwCloud = await getRepository(FwCloud).save(getRepository(FwCloud).create({
            name: StringHelper.randomize(10)
        }));

        firewall = await getRepository(Firewall).save(getRepository(Firewall).create({
            name: StringHelper.randomize(10),
            fwCloudId: fwCloud.id
        }));

        HAProxygroup = await getRepository(HAProxyGroup).save({
            name: StringHelper.randomize(10),
            firewall: firewall
        });
    });

    afterEach(async () => {
        sinon.restore();
    });

    describe('make', () => {

        it('should fetch HAProxyGroup when HAProxyGroup param is present', async () => {
            const requestMock = {
                params: {
                    HAProxygroup: HAProxygroup.id,
                    firewall: firewall.id,
                    fwcloud: fwCloud.id,
                }
            } as unknown as Request;

            const HAProxyGroupServiceStub = sinon.stub(HAProxyGroupService.prototype, 'findOneInPath').resolves(HAProxygroup);
            const firewallStub = sinon.stub(getRepository(Firewall), 'findOneOrFail').resolves(firewall);
            const fwCloudStub = sinon.stub(getRepository(FwCloud), 'findOneOrFail').resolves(fwCloud);

            await controller.make(requestMock);

            expect(HAProxyGroupServiceStub.calledOnce).to.be.true;
            expect(firewallStub.calledOnce).to.be.true;
            expect(fwCloudStub.calledOnce).to.be.true;

            HAProxyGroupServiceStub.restore();
            firewallStub.restore();
            fwCloudStub.restore();
        });

        it('should fetch Firewall and FwCloud when HAProxyGroup param is not present', async () => {
            const requestMock = {
                params: {
                    firewall: firewall.id,
                    fwcloud: fwCloud.id,
                }
            } as unknown as Request;

            const HAProxyGroupServiceStub = sinon.stub(HAProxyGroupService.prototype, 'findOneInPath')
            const firewallStub = sinon.stub(getRepository(Firewall), 'findOneOrFail');
            const fwCloudStub = sinon.stub(getRepository(FwCloud), 'findOneOrFail');

            await controller.make(requestMock);

            expect(HAProxyGroupServiceStub.calledOnce).to.be.false;
            expect(firewallStub.calledOnce).to.be.true;
            expect(fwCloudStub.calledOnce).to.be.true;

            HAProxyGroupServiceStub.restore();
            firewallStub.restore();
            fwCloudStub.restore();
        });

        it('should handle errors when entities are not found', async () => {
            const requestMock = {
                params: {
                    HAProxygroup: 9999,
                    firewall: firewall.id,
                    fwcloud: fwCloud.id,
                }
            } as unknown as Request;

            const HAProxyGroupServiceStub = sinon.stub(HAProxyGroupService.prototype, 'findOneInPath').throws(new Error('HAProxy Group not found'));

            await expect(controller.make(requestMock)).to.be.rejectedWith('HAProxy Group not found');

            HAProxyGroupServiceStub.restore();
        });
    });
});