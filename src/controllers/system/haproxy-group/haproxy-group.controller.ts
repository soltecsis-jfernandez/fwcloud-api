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
import { Controller } from "../../../fonaments/http/controller";
import { Firewall } from "../../../models/firewall/Firewall";
import { FwCloud } from "../../../models/fwcloud/FwCloud";
import { HAProxyGroup } from "../../../models/system/haproxy/haproxy_g/haproxy_g.model";
import { HAProxyGroupService } from "../../../models/system/haproxy/haproxy_g/haproxy_g.service";
import { Request } from 'express';
import { HAProxyGroupPolicy } from "../../../policies/haproxy-group.policy";
import { Validate } from "../../../decorators/validate.decorator";
import { ResponseBuilder } from "../../../fonaments/http/response-builder";
import { HAProxyGroupControllerCreateDto } from "./dto/create.dto";
import { HAProxyGroupUpdateDto } from "./dto/update.dto";
import { HAProxyRuleService } from "../../../models/system/haproxy/haproxy_r/haproxy_r.service";

export class HAProxyGroupController extends Controller {
  protected _haproxyGroupService: HAProxyGroupService;
  protected _haproxyRuleService: HAProxyRuleService;

  protected _firewall: Firewall;
  protected _fwCloud: FwCloud;
  protected _haproxyGroup: HAProxyGroup;

  public async make(request: Request): Promise<void> {
    this._haproxyGroupService = await this._app.getService<HAProxyGroupService>(HAProxyGroupService.name);
    this._haproxyRuleService = await this._app.getService<HAProxyRuleService>(HAProxyRuleService.name);

    if (request.params.HAProxygroup) {
      this._haproxyGroup = await this._haproxyGroupService.findOneInPath({ id: parseInt(request.params.HAProxygroup) });
    }

    this._firewall = await getRepository(Firewall).findOneOrFail(request.params.firewall);
    this._fwCloud = await getRepository(FwCloud).findOneOrFail(request.params.fwcloud);
  }

  @Validate()
  async index(req: Request): Promise<ResponseBuilder> {
    (await HAProxyGroupPolicy.index(this._firewall, req.session.user)).authorize();

    const groups: HAProxyGroup[] = await this._haproxyGroupService.findManyInPath({
      firewallId: this._firewall.id,
      fwcloudId: this._fwCloud.id,
    }) as unknown as HAProxyGroup[];

    return ResponseBuilder.buildResponse().status(200).body(groups);
  }

  @Validate(HAProxyGroupControllerCreateDto)
  async create(req: Request): Promise<ResponseBuilder> {
    (await HAProxyGroupPolicy.create(this._firewall, req.session.user)).authorize();

    const group: HAProxyGroup = await this._haproxyGroupService.create({
      firewallId: this._firewall.id,
      name: req.body.name,
      style: req.body.style,
      rules: req.inputs.get<number[]>('rules')?.map((id) => ({ id })),
    });

    if (req.inputs.get<number[]>('rules')) {
      await this._haproxyRuleService.bulkUpdate(req.inputs.get<number[]>('rules')?.map((id) => id), { group: group.id });
    }

    return ResponseBuilder.buildResponse().status(201).body(group);
  }

  @Validate()
  async show(req: Request): Promise<ResponseBuilder> {
    (await HAProxyGroupPolicy.show(this._haproxyGroup, req.session.user)).authorize();

    return ResponseBuilder.buildResponse().status(200).body(this._haproxyGroup);
  }

  @Validate(HAProxyGroupUpdateDto)
  async update(req: Request): Promise<ResponseBuilder> {
    (await HAProxyGroupPolicy.update(this._haproxyGroup, req.session.user)).authorize();

    const result = await this._haproxyGroupService.update(this._haproxyGroup.id, req.inputs.all());

    return ResponseBuilder.buildResponse().status(200).body(result);
  }

  @Validate()
  async remove(req: Request): Promise<ResponseBuilder> {
    (await HAProxyGroupPolicy.remove(this._haproxyGroup, req.session.user)).authorize();

    await this._haproxyGroupService.remove({
      id: this._haproxyGroup.id,
      firewallId: this._firewall.id,
      fwcloudId: this._fwCloud.id,
    });
    return ResponseBuilder.buildResponse().status(200).body(this._haproxyGroup);
  }
}