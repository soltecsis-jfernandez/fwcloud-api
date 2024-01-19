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
import { getRepository } from "typeorm";
import { Application } from "../../../../../src/Application";
import { HAProxyGroupController } from "../../../../../src/controllers/system/haproxy-group/haproxy-group.controller";
import { _URL } from "../../../../../src/fonaments/http/router/router.service";
import { Firewall } from "../../../../../src/models/firewall/Firewall";
import { FwCloud } from "../../../../../src/models/fwcloud/FwCloud";
import { HAProxyGroup } from "../../../../../src/models/system/haproxy/haproxy_g/haproxy_g.model";
import { HAProxyGroupService } from "../../../../../src/models/system/haproxy/haproxy_g/haproxy_g.service";
import { User } from "../../../../../src/models/user/User";
import { expect, testSuite } from "../../../../mocha/global-setup";
import { FwCloudFactory, FwCloudProduct } from "../../../../utils/fwcloud-factory";
import { attachSession, createUser, generateSession } from "../../../../utils/utils";
import request = require("supertest");

describe('haproxyGroup E2E Tests', () => {
    let app: Application;
    let loggedUser: User;
    let loggedUserSessionId: string;

    let adminUser: User;
    let adminUserSessionId: string;

    let fwcProduct: FwCloudProduct;
    let firewall: Firewall;
    let fwCloud: FwCloud;

    let haproxyGroupService: HAProxyGroupService;
//TODO: REVISAR TESTS
    beforeEach(async () => {
        app = testSuite.app;
        await testSuite.resetDatabaseData();

        loggedUser = await createUser({ role: 0 });
        loggedUserSessionId = generateSession(loggedUser);

        adminUser = await createUser({ role: 1 });
        adminUserSessionId = generateSession(adminUser);

        haproxyGroupService = await app.getService<HAProxyGroupService>(HAProxyGroupService.name);

        fwcProduct = await new FwCloudFactory().make();

        fwCloud = fwcProduct.fwcloud;

        firewall = fwcProduct.firewall;
    });

    describe(HAProxyGroupController.name, () => {
        describe('@index', () => {
            let group: HAProxyGroup;

            beforeEach(async () => {
                group = await getRepository(HAProxyGroup).save(getRepository(HAProxyGroup).create({
                    firewall: firewall,
                    name: 'group',
                    style: 'style'
                }));
            });

            it('guest user should not be able to list haproxy groups', async () => {
                return await request(app.express)
                    .get(_URL().getURL('fwclouds.firewalls.system.haproxy.groups.index', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id,
                    }))
                    .set('Cookie', [attachSession(loggedUserSessionId)])
                    .expect(401);
            });

            it('regular user which does not belong to the firewall should not be able to list haproxy groups', async () => {
                return await request(app.express)
                    .get(_URL().getURL('fwclouds.firewalls.system.haproxy.groups.index', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id,
                    }))
                    .set('Cookie', [attachSession(loggedUserSessionId)])
                    .expect(401);
            });

            it('regular user which belongs to the firewall should be able to list haproxy groups', async () => {
                loggedUser.fwClouds = [fwCloud];
                await getRepository(User).save(loggedUser);

                return await request(app.express)
                    .get(_URL().getURL('fwclouds.firewalls.system.haproxy.groups.index', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id,
                    }))
                    .set('Cookie', [attachSession(loggedUserSessionId)])
                    .expect(200)
                    .then((response) => {
                        expect(response.body.data).to.have.lengthOf(1);
                    });
            });

            it('admin user should be able to list haproxy groups', async () => {
                return await request(app.express)
                    .get(_URL().getURL('fwclouds.firewalls.system.haproxy.groups.index', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id,
                    }))
                    .set('Cookie', [attachSession(adminUserSessionId)])
                    .expect(200)
                    .then((response) => {
                        expect(response.body.data).to.have.lengthOf(1);
                    });
            });
        });

        describe('@create', () => {
            it('guest user should not be able to create a haproxy group', async () => {
                return await request(app.express)
                    .post(_URL().getURL('fwclouds.firewalls.system.haproxy.groups.store', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id,
                    }))
                    .send({
                        name: 'group',
                    })
                    .expect(401);
            });

            it('regular user which does not belong to the firewall should not be able to create a haproxy group', async () => {
                return await request(app.express)
                    .post(_URL().getURL('fwclouds.firewalls.system.haproxy.groups.store', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id,
                    }))
                    .set('Cookie', [attachSession(loggedUserSessionId)])
                    .send({
                        name: 'group',
                    })
                    .expect(401);
            });

            it('regular user which belongs to the firewall should be able to create a haproxy group', async () => {
                loggedUser.fwClouds = [fwCloud];
                await getRepository(User).save(loggedUser);

                return await request(app.express)
                    .post(_URL().getURL('fwclouds.firewalls.system.haproxy.groups.store', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id,
                    }))
                    .set('Cookie', [attachSession(loggedUserSessionId)])
                    .send({
                        name: 'group',
                    })
                    .expect(201);
            });

            it('admin user should be able to create a haproxy group', async () => {
                return await request(app.express)
                    .post(_URL().getURL('fwclouds.firewalls.system.haproxy.groups.store', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id,
                    }))
                    .set('Cookie', [attachSession(adminUserSessionId)])
                    .send({
                        name: 'group',
                    })
                    .expect(201);
            });
        });

        describe('@show', () => {
            let haproxyGroup: HAProxyGroup;

            beforeEach(async () => {
                haproxyGroup = await getRepository(HAProxyGroup).save(getRepository(HAProxyGroup).create({
                    firewall: firewall,
                    name: 'group',
                    style: 'style'
                }));
            });

            it('guest user should not be able to show a haproxy group', async () => {
                return await request(app.express)
                    .get(_URL().getURL('fwclouds.firewalls.system.haproxy.groups.show', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id,
                        haproxygroup: haproxyGroup.id,
                    }))
                    .expect(401);
            });

            it('regular user which does not belong to the firewall should not be able to show a haproxy group', async () => {
                return await request(app.express)
                    .get(_URL().getURL('fwclouds.firewalls.system.haproxy.groups.show', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id,
                        haproxygroup: haproxyGroup.id,
                    }))
                    .set('Cookie', [attachSession(loggedUserSessionId)])
                    .expect(401);
            });

            it('regular user which belongs to the firewall should be able to show a haproxy group', async () => {
                loggedUser.fwClouds = [fwCloud];
                await getRepository(User).save(loggedUser);

                return await request(app.express)
                    .get(_URL().getURL('fwclouds.firewalls.system.haproxy.groups.show', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id,
                        haproxygroup: haproxyGroup.id,
                    }))
                    .set('Cookie', [attachSession(loggedUserSessionId)])
                    .expect(200);
            });

            it('admin user should be able to show a haproxy group', async () => {
                return await request(app.express)
                    .get(_URL().getURL('fwclouds.firewalls.system.haproxy.groups.show', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id,
                        haproxygroup: haproxyGroup.id,
                    }))
                    .set('Cookie', [attachSession(adminUserSessionId)])
                    .expect(200);
            });
        });

        describe('@update', () => {
            let haproxyGroup: HAProxyGroup;

            beforeEach(async () => {
                haproxyGroup = await haproxyGroupService.create({
                    firewallId: firewall.id,
                    name: 'group',
                    style: 'style'
                });
            });

            it('guest user should not be able to update a haproxy group', async () => {
                return await request(app.express)
                    .put(_URL().getURL('fwclouds.firewalls.system.haproxy.groups.update', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id,
                        haproxygroup: haproxyGroup.id,
                    }))
                    .send({
                        name: 'group',
                    })
                    .expect(401);
            });

            it('regular user which does not belong to the firewall should not be able to update a haproxy group', async () => {
                return await request(app.express)
                    .put(_URL().getURL('fwclouds.firewalls.system.haproxy.groups.update', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id,
                        haproxygroup: haproxyGroup.id,
                    }))
                    .set('Cookie', [attachSession(loggedUserSessionId)])
                    .send({
                        name: 'group1',
                    })
                    .expect(401);
            });

            it('regular user which belongs to the firewall should be able to update a haproxy group', async () => {
                loggedUser.fwClouds = [fwCloud];
                await getRepository(User).save(loggedUser);

                return await request(app.express)
                    .put(_URL().getURL('fwclouds.firewalls.system.haproxy.groups.update', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id,
                        haproxygroup: haproxyGroup.id,
                    }))
                    .set('Cookie', [attachSession(loggedUserSessionId)])
                    .send({
                        name: 'group1',
                    })
                    .expect(200);
            });

            it('admin user should be able to update a haproxy group', async () => {
                return await request(app.express)
                    .put(_URL().getURL('fwclouds.firewalls.system.haproxy.groups.update', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id,
                        haproxygroup: haproxyGroup.id,
                    }))
                    .set('Cookie', [attachSession(adminUserSessionId)])
                    .send({
                        name: 'group1',
                    })
                    .expect(200);
            });
        });

        describe('@remove', () => {
            let haproxyGroup: HAProxyGroup;

            beforeEach(async () => {
                haproxyGroup = await haproxyGroupService.create({
                    firewallId: firewall.id,
                    name: 'group',
                    style: 'style'
                });
            });

            it('guest user should not be able to remove a haproxy group', async () => {
                return await request(app.express)
                    .delete(_URL().getURL('fwclouds.firewalls.system.haproxy.groups.delete', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id,
                        haproxygroup: haproxyGroup.id,
                    }))
                    .expect(401);
            });

            it('regular user which does not belong to the firewall should not be able to remove a haproxy group', async () => {
                return await request(app.express)
                    .delete(_URL().getURL('fwclouds.firewalls.system.haproxy.groups.delete', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id,
                        haproxygroup: haproxyGroup.id,
                    }))
                    .set('Cookie', [attachSession(loggedUserSessionId)])
                    .expect(401);
            });

            it('regular user which belongs to the firewall should be able to remove a haproxy group', async () => {
                loggedUser.fwClouds = [fwCloud];
                await getRepository(User).save(loggedUser);

                return await request(app.express)
                    .delete(_URL().getURL('fwclouds.firewalls.system.haproxy.groups.delete', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id,
                        haproxygroup: haproxyGroup.id,
                    }))
                    .set('Cookie', [attachSession(loggedUserSessionId)])
                    .expect(200);
            });

            it('admin user should be able to remove a haproxy group', async () => {
                return await request(app.express)
                    .delete(_URL().getURL('fwclouds.firewalls.system.haproxy.groups.delete', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id,
                        haproxygroup: haproxyGroup.id,
                    }))
                    .set('Cookie', [attachSession(adminUserSessionId)])
                    .expect(200);
            });
        });
    });
});
