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
import { Firewall } from "../../../../../src/models/firewall/Firewall";
import { FwCloud } from "../../../../../src/models/fwcloud/FwCloud";
import { HAProxyRule } from "../../../../../src/models/system/haproxy/haproxy_r/haproxy_r.model";
import { User } from "../../../../../src/models/user/User";
import { expect, testSuite } from "../../../../mocha/global-setup";
import { attachSession, createUser, generateSession } from "../../../../utils/utils";
import { HAProxyRuleService } from "../../../../../src/models/system/haproxy/haproxy_r/haproxy_r.service";
import { FwCloudFactory, FwCloudProduct } from "../../../../utils/fwcloud-factory";
import { HAProxyController } from "../../../../../src/controllers/system/haproxy/haproxy.controller";
import request = require("supertest");
import { _URL } from "../../../../../src/fonaments/http/router/router.service";
import { HAProxyGroup } from "../../../../../src/models/system/haproxy/haproxy_g/haproxy_g.model";
import { getCustomRepository, getRepository } from "typeorm";
import { HAProxyRuleCopyDto } from "../../../../../src/controllers/system/haproxy/dto/copy.dto";
import { HAProxyRepository } from "../../../../../src/models/system/haproxy/haproxy_r/haproxy.repository";
import { Offset } from "../../../../../src/offset";
import { HAProxyRuleBulkUpdateDto } from "../../../../../src/controllers/system/haproxy/dto/bulk-update.dto";

describe('haproxyRule E2E Tests', () => {
    let app: Application;
    let loggedUser: User;
    let loggedUserSessionId: string;

    let adminUser: User;
    let adminUserSessionId: string;

    let fwcProduct: FwCloudProduct;
    let fwCloud: FwCloud;
    let firewall: Firewall;
    let group: HAProxyGroup;

    let haproxyRuleServiceInstance: HAProxyRuleService;
//TODO: REVISAR TESTS
    beforeEach(async () => {
        app = testSuite.app;
        await testSuite.resetDatabaseData();

        loggedUser = await createUser({ role: 0 });
        loggedUserSessionId = generateSession(loggedUser);

        adminUser = await createUser({ role: 1 });
        adminUserSessionId = generateSession(adminUser);

        haproxyRuleServiceInstance = await app.getService(HAProxyRuleService.name);

        fwcProduct = await new FwCloudFactory().make();

        fwCloud = fwcProduct.fwcloud;

        firewall = fwcProduct.firewall;

        group = await getRepository(HAProxyGroup).save(getRepository(HAProxyGroup).create({
            name: 'group',
            firewall: firewall,
        }));
    });

    describe(HAProxyController.name, () => {
        describe('@index', () => {
            let haproxyRule: HAProxyRule;

            beforeEach(async () => {
                haproxyRule = await haproxyRuleServiceInstance.store({
                    active: true,
                    groupId: group.id,
                    firewallId: firewall.id,
                    comment: "comment",
                    rule_order: 1,
                });
            });

            it('guest user should not see haproxy rules', async () => {
                return await request(app.express)
                    .get(_URL().getURL('fwclouds.firewalls.system.haproxy.index', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id
                    }))
                    .set('Cookie', [attachSession(loggedUserSessionId)])
                    .expect(401);
            });

            it('regular user which does not belong to the fwcloud should not see haproxy rules', async () => {
                return await request(app.express)
                    .get(_URL().getURL('fwclouds.firewalls.system.haproxy.index', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id
                    }))
                    .set('Cookie', [attachSession(loggedUserSessionId)])
                    .expect(401);
            });

            it('regular user which belongs to the fwcloud should see haproxy rules', async () => {
                loggedUser.fwClouds = [fwCloud];
                await getRepository(User).save(loggedUser);

                return await request(app.express)
                    .get(_URL().getURL('fwclouds.firewalls.system.haproxy.index', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id,
                    }))
                    .set('Cookie', [attachSession(loggedUserSessionId)])
                    .expect(200)
                    .then(response => {
                        expect(response.body.data).to.have.length(1);
                    });
            });

            it('admin user should see haproxy rules', async () => {
                return await request(app.express)
                    .get(_URL().getURL('fwclouds.firewalls.system.haproxy.index', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id
                    }))
                    .set('Cookie', [attachSession(adminUserSessionId)])
                    .expect(200)
                    .then((response) => {
                        expect(response.body.data).to.have.length(1);
                    });
            });
        });

        describe('@grid', () => {
            let haproxyRule: HAProxyRule;

            beforeEach(async () => {
                haproxyRule = await haproxyRuleServiceInstance.store({
                    active: true,
                    groupId: group.id,
                    firewallId: firewall.id,
                    comment: "comment",
                    rule_order: 1,
                });
            });

            it('guest user should not see haproxy rules grid', async () => {
                return await request(app.express)
                    .get(_URL().getURL('fwclouds.firewalls.system.haproxy.grid', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id
                    }))
                    .set('Cookie', [attachSession(loggedUserSessionId)])
                    .expect(401);
            });

            it('regular user which does not belong to the fwcloud should not see haproxy rules grid', async () => {
                return await request(app.express)
                    .get(_URL().getURL('fwclouds.firewalls.system.haproxy.grid', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id
                    }))
                    .set('Cookie', [attachSession(loggedUserSessionId)])
                    .expect(401);
            });

            it('regular user which belongs to the fwcloud should see haproxy rules grid', async () => {
                loggedUser.fwClouds = [fwCloud];
                await getRepository(User).save(loggedUser);

                return await request(app.express)
                    .get(_URL().getURL('fwclouds.firewalls.system.haproxy.grid', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id,
                    }))
                    .set('Cookie', [attachSession(loggedUserSessionId)])
                    .expect(200)
                    .then(response => {
                        expect(response.body.data[0].id).to.deep.equal(haproxyRule.id);
                    });
            });

            it('admin user should see haproxy rules grid', async () => {
                return await request(app.express)
                    .get(_URL().getURL('fwclouds.firewalls.system.haproxy.grid', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id
                    }))
                    .set('Cookie', [attachSession(adminUserSessionId)])
                    .expect(200)
                    .then((response) => {
                        expect(response.body.data[0].id).to.deep.equal(haproxyRule.id);
                    });
            });
        });

        describe('@create', () => {
            it('guest user should not create an haproxy rule', async () => {
                return await request(app.express)
                    .post(_URL().getURL('fwclouds.firewalls.system.haproxy.store', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id
                    }))
                    .send({
                        active: true,
                        groupId: group.id,
                        firewallId: firewall.id,
                        max_lease: 5,
                        cfg_text: "cfg_text",
                        comment: "comment",
                    })
                    .expect(401);
            });

            it('regular user which does not belong to the fwcloud should not create an haproxy rule', async () => {
                return await request(app.express)
                    .post(_URL().getURL('fwclouds.firewalls.system.haproxy.store', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id
                    }))
                    .set('Cookie', [attachSession(loggedUserSessionId)])
                    .send({
                        active: true,
                        groupId: group.id,
                        firewallId: firewall.id,
                        max_lease: 5,
                        cfg_text: "cfg_text",
                        comment: "comment",
                    })
                    .expect(401);
            });

            it('regular user which belongs to the fwcloud should create an haproxy rule', async () => {
                loggedUser.fwClouds = [fwCloud];
                await getRepository(User).save(loggedUser);

                return await request(app.express)
                    .post(_URL().getURL('fwclouds.firewalls.system.haproxy.store', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id,
                    }))
                    .set('Cookie', [attachSession(loggedUserSessionId)])
                    .send({
                        active: true,
                        groupId: group.id,
                        firewallId: firewall.id,
                        max_lease: 5,
                        cfg_text: "cfg_text",
                        comment: "comment",
                    })
                    .expect(201)
                    .then(response => {
                        expect(response.body.data).to.have.property('id');
                    });
            });

            it('admin user should create an haproxy rule', async () => {
                return await request(app.express)
                    .post(_URL().getURL('fwclouds.firewalls.system.haproxy.store', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id
                    }))
                    .set('Cookie', [attachSession(adminUserSessionId)])
                    .send({
                        active: true,
                        groupId: group.id,
                        firewallId: firewall.id,
                        max_lease: 5,
                        cfg_text: "cfg_text",
                        comment: "comment",
                    })
                    .expect(201)
                    .then((response) => {
                        expect(response.body.data).to.have.property('id');
                    });
            });
        });

        describe('@copy', () => {
            let haproxyRule1: HAProxyRule;
            let haproxyRule2: HAProxyRule;
            let data: HAProxyRuleCopyDto;

            beforeEach(async () => {
                haproxyRule1 = await haproxyRuleServiceInstance.store({
                    active: true,
                    groupId: group.id,
                    firewallId: firewall.id,
                    comment: "comment",
                    rule_order: 1,
                });
                haproxyRule2 = await haproxyRuleServiceInstance.store({
                    active: true,
                    groupId: group.id,
                    firewallId: firewall.id,
                    comment: "comment",
                    rule_order: 2,
                });
                data = {
                    rules: [haproxyRule1.id, haproxyRule2.id],
                    to: (await getCustomRepository(HAProxyRepository).getLastHAProxyRuleInGroup(group.id)).id,
                    offset: Offset.Below,
                } as HAProxyRuleCopyDto;
            });

            it('guest user should not copy an haproxy rule', async () => {
                return await request(app.express)
                    .post(_URL().getURL('fwclouds.firewalls.system.haproxy.copy', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id
                    }))
                    .send(data)
                    .expect(401);
            });

            it('regular user which does not belong to the fwcloud should not copy an haproxy rule', async () => {
                return await request(app.express)
                    .post(_URL().getURL('fwclouds.firewalls.system.haproxy.copy', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id
                    }))
                    .set('Cookie', [attachSession(loggedUserSessionId)])
                    .send(data)
                    .expect(401);
            });

            it('regular user which belongs to the fwcloud should copy an haproxy rule', async () => {
                loggedUser.fwClouds = [fwCloud];
                await getRepository(User).save(loggedUser);

                return await request(app.express)
                    .post(_URL().getURL('fwclouds.firewalls.system.haproxy.copy', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id,
                    }))
                    .set('Cookie', [attachSession(loggedUserSessionId)])
                    .send(data)
                    .expect(201)
                    .then(response => {
                        expect(response.body.data).to.have.length(2);
                    });
            });

            it('admin user should copy an haproxy rule', async () => {
                return await request(app.express)
                    .post(_URL().getURL('fwclouds.firewalls.system.haproxy.copy', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id
                    }))
                    .set('Cookie', [attachSession(adminUserSessionId)])
                    .send(data)
                    .expect(201)
                    .then((response) => {
                        expect(response.body.data).to.have.length(2);
                    });
            });
        });

        describe('@update', () => {
            let haproxyRule: HAProxyRule;

            beforeEach(async () => {
                haproxyRule = await haproxyRuleServiceInstance.store({
                    active: true,
                    groupId: group.id,
                    firewallId: firewall.id,
                    comment: "comment",
                    rule_order: 1,
                });
            });

            it('guest user should not update an haproxy rule', async () => {
                return await request(app.express)
                    .put(_URL().getURL('fwclouds.firewalls.system.haproxy.update', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id,
                        haproxy: haproxyRule.id,
                    }))
                    .send({
                        active: false,
                        groupId: group.id,
                        firewallId: firewall.id,
                        max_lease: 5,
                        cfg_text: "cfg_text",
                        comment: "comment",
                    })
                    .expect(401);
            });

            it('regular user which does not belong to the fwcloud should not update an haproxy rule', async () => {
                return await request(app.express)
                    .put(_URL().getURL('fwclouds.firewalls.system.haproxy.update', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id,
                        haproxy: haproxyRule.id,
                    }))
                    .set('Cookie', [attachSession(loggedUserSessionId)])
                    .send({
                        active: false,
                        groupId: group.id,
                        firewallId: firewall.id,
                        max_lease: 5,
                        cfg_text: "cfg_text",
                        comment: "comment",
                    })
                    .expect(401);
            });

            it('regular user which belongs to the fwcloud should update an haproxy rule', async () => {
                loggedUser.fwClouds = [fwCloud];
                await getRepository(User).save(loggedUser);

                return await request(app.express)
                    .put(_URL().getURL('fwclouds.firewalls.system.haproxy.update', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id,
                        haproxy: haproxyRule.id,
                    }))
                    .set('Cookie', [attachSession(loggedUserSessionId)])
                    .send({
                        active: false,
                        groupId: group.id,
                        firewallId: firewall.id,
                        max_lease: 5,
                        cfg_text: "cfg_text",
                        comment: "comment",
                    })
                    .expect(200)
                    .then(response => {
                        expect(response.body.data).to.have.property('id');
                    });
            });

            it('admin user should update an haproxy rule', async () => {
                return await request(app.express)
                    .put(_URL().getURL('fwclouds.firewalls.system.haproxy.update', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id,
                        haproxy: haproxyRule.id,
                    }))
                    .set('Cookie', [attachSession(adminUserSessionId)])
                    .send({
                        active: false,
                        groupId: group.id,
                        firewallId: firewall.id,
                        max_lease: 5,
                        cfg_text: "cfg_text",
                        comment: "comment",
                    })
                    .expect(200)
                    .then((response) => {
                        expect(response.body.data).to.have.property('id');
                    });
            });
        });

        describe('@remove', () => {
            let haproxyRule: HAProxyRule;

            beforeEach(async () => {
                haproxyRule = await haproxyRuleServiceInstance.store({
                    active: true,
                    groupId: group.id,
                    firewallId: firewall.id,
                    comment: "comment",
                    rule_order: 1,
                });
            });

            it('guest user should not remove an haproxy rule', async () => {
                return await request(app.express)
                    .delete(_URL().getURL('fwclouds.firewalls.system.haproxy.delete', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id,
                        haproxy: haproxyRule.id,
                    }))
                    .expect(401);
            });

            it('regular user which does not belong to the fwcloud should not remove an haproxy rule', async () => {
                return await request(app.express)
                    .delete(_URL().getURL('fwclouds.firewalls.system.haproxy.delete', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id,
                        haproxy: haproxyRule.id,
                    }))
                    .set('Cookie', [attachSession(loggedUserSessionId)])
                    .expect(401);
            });

            it('regular user which belongs to the fwcloud should remove an haproxy rule', async () => {
                loggedUser.fwClouds = [fwCloud];
                await getRepository(User).save(loggedUser);

                return await request(app.express)
                    .delete(_URL().getURL('fwclouds.firewalls.system.haproxy.delete', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id,
                        haproxy: haproxyRule.id,
                    }))
                    .set('Cookie', [attachSession(loggedUserSessionId)])
                    .expect(200)
                    .then(response => {
                        expect(response.body.data).to.have.property('id');
                    });
            });

            it('admin user should remove an haproxy rule', async () => {
                return await request(app.express)
                    .delete(_URL().getURL('fwclouds.firewalls.system.haproxy.delete', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id,
                        haproxy: haproxyRule.id,
                    }))
                    .set('Cookie', [attachSession(adminUserSessionId)])
                    .expect(200)
                    .then((response) => {
                        expect(response.body.data).to.have.property('id');
                    });
            });
        });

        describe('@show', () => {
            let haproxyRule: HAProxyRule;

            beforeEach(async () => {
                haproxyRule = await haproxyRuleServiceInstance.store({
                    active: true,
                    groupId: group.id,
                    firewallId: firewall.id,
                    comment: "comment",
                    rule_order: 1,
                });
            });

            it('guest user should not see an haproxy rule', async () => {
                return await request(app.express)
                    .get(_URL().getURL('fwclouds.firewalls.system.haproxy.show', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id,
                        haproxy: haproxyRule.id,
                    }))
                    .expect(401);
            });

            it('regular user which does not belong to the fwcloud should not see an haproxy rule', async () => {
                return await request(app.express)
                    .get(_URL().getURL('fwclouds.firewalls.system.haproxy.show', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id,
                        haproxy: haproxyRule.id,
                    }))
                    .set('Cookie', [attachSession(loggedUserSessionId)])
                    .expect(401);
            });

            it('regular user which belongs to the fwcloud should see an haproxy rule', async () => {
                loggedUser.fwClouds = [fwCloud];
                await getRepository(User).save(loggedUser);

                return await request(app.express)
                    .get(_URL().getURL('fwclouds.firewalls.system.haproxy.show', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id,
                        haproxy: haproxyRule.id,
                    }))
                    .set('Cookie', [attachSession(loggedUserSessionId)])
                    .expect(200)
                    .then(response => {
                        expect(response.body.data).to.have.property('id');
                    });
            });

            it('admin user should see an haproxy rule', async () => {
                return await request(app.express)
                    .get(_URL().getURL('fwclouds.firewalls.system.haproxy.show', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id,
                        haproxy: haproxyRule.id,
                    }))
                    .set('Cookie', [attachSession(adminUserSessionId)])
                    .expect(200)
                    .then((response) => {
                        expect(response.body.data).to.have.property('id');
                    });
            });
        });

        describe('@move', () => {
            let haproxyRule1: HAProxyRule;
            let haproxyRule2: HAProxyRule;
            let haproxyRule3: HAProxyRule;
            let haproxyRule4: HAProxyRule;
            let data: HAProxyRuleCopyDto;

            beforeEach(async () => {
                haproxyRule1 = await haproxyRuleServiceInstance.store({
                    active: true,
                    groupId: group.id,
                    firewallId: firewall.id,
                    comment: "comment",
                    rule_order: 1,
                });
                haproxyRule2 = await haproxyRuleServiceInstance.store({
                    active: true,
                    groupId: group.id,
                    firewallId: firewall.id,
                    comment: "comment",
                    rule_order: 2,
                });
                haproxyRule3 = await haproxyRuleServiceInstance.store({
                    active: true,
                    groupId: group.id,
                    firewallId: firewall.id,
                    comment: "comment",
                    rule_order: 3,
                });
                haproxyRule4 = await haproxyRuleServiceInstance.store({
                    active: true,
                    groupId: group.id,
                    firewallId: firewall.id,
                    comment: "comment",
                    rule_order: 4,
                });
                data = {
                    rules: [haproxyRule1.id, haproxyRule2.id],
                    to: haproxyRule3.rule_order,
                    offset: Offset.Above,
                } as HAProxyRuleCopyDto;
            });

            it('guest user should not move an haproxy rule', async () => {
                return await request(app.express)
                    .put(_URL().getURL('fwclouds.firewalls.system.haproxy.move', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id
                    }))
                    .send(data)
                    .expect(401);
            });

            it('regular user which does not belong to the fwcloud should not move an haproxy rule', async () => {
                return await request(app.express)
                    .put(_URL().getURL('fwclouds.firewalls.system.haproxy.move', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id
                    }))
                    .set('Cookie', [attachSession(loggedUserSessionId)])
                    .send(data)
                    .expect(401);
            });

            it('regular user which belongs to the fwcloud should move an haproxy rule', async () => {
                loggedUser.fwClouds = [fwCloud];
                await getRepository(User).save(loggedUser);

                await request(app.express)
                    .put(_URL().getURL('fwclouds.firewalls.system.haproxy.move', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id,
                    }))
                    .set('Cookie', [attachSession(loggedUserSessionId)])
                    .send(data)
                    .expect(200)
                    .then(response => {
                        expect(response.body.data).to.have.length(2);
                    });

                expect((await getRepository(HAProxyRule).findOneOrFail(haproxyRule1.id)).rule_order).to.equal(3);
                expect((await getRepository(HAProxyRule).findOneOrFail(haproxyRule2.id)).rule_order).to.equal(4);
                expect((await getRepository(HAProxyRule).findOneOrFail(haproxyRule3.id)).rule_order).to.equal(5);
                expect((await getRepository(HAProxyRule).findOneOrFail(haproxyRule4.id)).rule_order).to.equal(6);
            });

            it('admin user should move an haproxy rule', async () => {
                await request(app.express)
                    .put(_URL().getURL('fwclouds.firewalls.system.haproxy.move', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id
                    }))
                    .set('Cookie', [attachSession(adminUserSessionId)])
                    .send(data)
                    .expect(200)
                    .then((response) => {
                        expect(response.body.data).to.have.length(2);
                    });
                expect((await getRepository(HAProxyRule).findOneOrFail(haproxyRule1.id)).rule_order).to.equal(3);
                expect((await getRepository(HAProxyRule).findOneOrFail(haproxyRule2.id)).rule_order).to.equal(4);
                expect((await getRepository(HAProxyRule).findOneOrFail(haproxyRule3.id)).rule_order).to.equal(5);
                expect((await getRepository(HAProxyRule).findOneOrFail(haproxyRule4.id)).rule_order).to.equal(6);
            });
        });

        describe('@bulkUpdate', () => {
            let rule1: HAProxyRule;
            let rule2: HAProxyRule;
            let data: HAProxyRuleBulkUpdateDto = {
                active: false,
                style: 'style',
            };

            beforeEach(async () => {
                rule1 = await haproxyRuleServiceInstance.store({
                    active: true,
                    groupId: group.id,
                    firewallId: firewall.id,
                    comment: "comment",
                    rule_order: 1,
                });
                rule2 = await haproxyRuleServiceInstance.store({
                    active: true,
                    groupId: group.id,
                    firewallId: firewall.id,
                    comment: "comment",
                    rule_order: 2,
                });
            });

            it('guest user should not bulk update an haproxy rule', async () => {
                return await request(app.express)
                    .put(_URL().getURL('fwclouds.firewalls.system.haproxy.bulkUpdate', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id
                    }))
                    .query({
                        rules: [rule1.id, rule2.id],
                    })
                    .send(data)
                    .expect(401);
            });

            it('regular user which does not belong to the fwcloud should not bulk update an haproxy rule', async () => {
                return await request(app.express)
                    .put(_URL().getURL('fwclouds.firewalls.system.haproxy.bulkUpdate', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id
                    }))
                    .set('Cookie', [attachSession(loggedUserSessionId)])
                    .query({
                        rules: [rule1.id, rule2.id],
                    })
                    .send(data)
                    .expect(401);
            })

            it('regular user which belongs to the fwcloud should bulk update an haproxy rule', async () => {
                loggedUser.fwClouds = [fwCloud];
                await getRepository(User).save(loggedUser);

                await request(app.express)
                    .put(_URL().getURL('fwclouds.firewalls.system.haproxy.bulkUpdate', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id
                    }))
                    .set('Cookie', [attachSession(loggedUserSessionId)])
                    .query({
                        rules: [rule1.id, rule2.id],
                    })
                    .send(data)
                    .expect(200)
                    .then(response => {
                        expect(response.body.data).to.have.length(2);
                    });

                expect((await getRepository(HAProxyRule).findOneOrFail(rule1.id)).active).to.equal(false);
                expect((await getRepository(HAProxyRule).findOneOrFail(rule2.id)).active).to.equal(false);
            });

            it('admin user should bulk update an haproxy rule', async () => {
                await request(app.express)
                    .put(_URL().getURL('fwclouds.firewalls.system.haproxy.bulkUpdate', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id
                    }))
                    .set('Cookie', [attachSession(adminUserSessionId)])
                    .query({
                        rules: [rule1.id, rule2.id],
                    })
                    .send(data)
                    .expect(200)
                    .then((response) => {
                        expect(response.body.data).to.have.length(2);
                    });

                expect((await getRepository(HAProxyRule).findOneOrFail(rule1.id)).active).to.equal(false);
                expect((await getRepository(HAProxyRule).findOneOrFail(rule2.id)).active).to.equal(false);
            });
        });

        describe('@bulkRemove', () => {
            let rule1: HAProxyRule;
            let rule2: HAProxyRule;

            beforeEach(async () => {
                rule1 = await haproxyRuleServiceInstance.store({
                    active: true,
                    groupId: group.id,
                    firewallId: firewall.id,
                    comment: "comment",
                    rule_order: 1,
                });
                rule2 = await haproxyRuleServiceInstance.store({
                    active: true,
                    groupId: group.id,
                    firewallId: firewall.id,
                    comment: "comment",
                    rule_order: 2,
                });
            });

            it('guest user should not bulk remove an haproxy rule', async () => {
                return await request(app.express)
                    .delete(_URL().getURL('fwclouds.firewalls.system.haproxy.bulkRemove', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id
                    }))
                    .query({
                        rules: [rule1.id, rule2.id],
                    })
                    .expect(401);
            });

            it('regular user which does not belong to the fwcloud should not bulk remove an haproxy rule', async () => {
                return await request(app.express)
                    .delete(_URL().getURL('fwclouds.firewalls.system.haproxy.bulkRemove', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id
                    }))
                    .set('Cookie', [attachSession(loggedUserSessionId)])
                    .query({
                        rules: [rule1.id, rule2.id],
                    })
                    .expect(401);
            })

            it('regular user which belongs to the fwcloud should bulk remove an haproxy rule', async () => {
                loggedUser.fwClouds = [fwCloud];
                await getRepository(User).save(loggedUser);

                await request(app.express)
                    .delete(_URL().getURL('fwclouds.firewalls.system.haproxy.bulkRemove', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id
                    }))
                    .set('Cookie', [attachSession(loggedUserSessionId)])
                    .query({
                        rules: [rule1.id, rule2.id],
                    })
                    .expect(200)
                    .then(response => {
                        expect(response.body.data).to.have.length(2);
                    });

                expect(await getRepository(HAProxyRule).findOne(rule1.id)).to.be.undefined;
                expect(await getRepository(HAProxyRule).findOne(rule2.id)).to.be.undefined;
            });

            it('admin user should bulk remove an haproxy rule', async () => {
                await request(app.express)
                    .delete(_URL().getURL('fwclouds.firewalls.system.haproxy.bulkRemove', {
                        fwcloud: fwCloud.id,
                        firewall: firewall.id
                    }))
                    .set('Cookie', [attachSession(adminUserSessionId)])
                    .query({
                        rules: [rule1.id, rule2.id],
                    })
                    .expect(200)
                    .then((response) => {
                        expect(response.body.data).to.have.length(2);
                    });

                expect(await getRepository(HAProxyRule).findOne(rule1.id)).to.be.undefined;
                expect(await getRepository(HAProxyRule).findOne(rule2.id)).to.be.undefined;
            });
        });
    });
});