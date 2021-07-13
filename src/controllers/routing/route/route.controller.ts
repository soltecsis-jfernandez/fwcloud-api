/*!
    Copyright 2021 SOLTECSIS SOLUCIONES TECNOLOGICAS, SLU
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

import { Validate } from "../../../decorators/validate.decorator";
import { Controller } from "../../../fonaments/http/controller";
import { Firewall } from "../../../models/firewall/Firewall";
import { FwCloud } from "../../../models/fwcloud/FwCloud";
import { ICreateRoute, RouteService } from "../../../models/routing/route/route.service";
import { RoutingTable } from "../../../models/routing/routing-table/routing-table.model";
import { Request } from 'express';
import { ResponseBuilder } from "../../../fonaments/http/response-builder";
import { RoutePolicy } from "../../../policies/route.policy";
import { Route } from "../../../models/routing/route/route.model";
import { RouteControllerStoreDto } from "./dtos/store.dto";
import { RouteControllerUpdateDto } from "./dtos/update.dto";

export class RouteController extends Controller {
    protected _routeService: RouteService;
    protected _firewall: Firewall;
    protected _fwCloud: FwCloud;
    protected _routingTable: RoutingTable;

    public async make(request: Request): Promise<void> {
        this._routeService = await this._app.getService<RouteService>(RouteService.name);
        this._fwCloud = await FwCloud.findOneOrFail(parseInt(request.params.fwcloud));
        this._firewall = await Firewall.findOneOrFail(parseInt(request.params.firewall));
        this._routingTable = await RoutingTable.findOneOrFail(parseInt(request.params.routingTable));
    }

    @Validate()
    async index(request: Request): Promise<ResponseBuilder> {
        (await RoutePolicy.index(this._routingTable, request.session.user)).authorize();
        
        const routes: Route[] = await this._routeService.findManyInPath({
            fwCloudId: this._fwCloud.id,
            firewallId: this._firewall.id,
            routingTableId: this._routingTable.id,
        });

        return ResponseBuilder.buildResponse().status(200).body(routes); 
    }

    @Validate()
    async show(request: Request): Promise<ResponseBuilder> {
        const route: Route = await this._routeService.findOneInPathOrFail({
            fwCloudId: this._fwCloud.id,
            firewallId: this._firewall.id,
            routingTableId: this._routingTable.id,
            id: parseInt(request.params.route)
        });

        (await RoutePolicy.show(route, request.session.user)).authorize();

        return ResponseBuilder.buildResponse().status(200).body(route);
    }

    @Validate(RouteControllerStoreDto)
    async store(request: Request): Promise<ResponseBuilder> {

        (await RoutePolicy.create(this._routingTable, request.session.user)).authorize();

        //Get the routingTable from the URL
        const data: ICreateRoute = Object.assign({}, request.inputs.all<ICreateRoute>(), {routingTableId: this._routingTable.id});
        
        const route: Route = await this._routeService.create(data);

        return ResponseBuilder.buildResponse().status(201).body(route);
    }

    @Validate(RouteControllerUpdateDto)
    async update(request: Request): Promise<ResponseBuilder> {
        const route: Route = await this._routeService.findOneInPathOrFail({
            fwCloudId: this._fwCloud.id,
            firewallId: this._firewall.id,
            routingTableId: this._routingTable.id,
            id: parseInt(request.params.route)
        });
        
        (await RoutePolicy.update(route, request.session.user)).authorize();

        const result: Route = await this._routeService.update(route.id, request.inputs.all());

        return ResponseBuilder.buildResponse().status(200).body(result);
    }
    
    @Validate()
    async remove(request: Request): Promise<ResponseBuilder> {
        const route: Route = await this._routeService.findOneInPathOrFail({
            fwCloudId: this._fwCloud.id,
            firewallId: this._firewall.id,
            routingTableId: this._routingTable.id,
            id: parseInt(request.params.route)
        });
        
        (await RoutePolicy.delete(route, request.session.user)).authorize();

        await this._routeService.remove({
            fwCloudId: this._fwCloud.id,
            firewallId: this._firewall.id,
            routingTableId: this._routingTable.id,
            id: parseInt(request.params.route)
        });
        return ResponseBuilder.buildResponse().status(200).body(route);
    }
}