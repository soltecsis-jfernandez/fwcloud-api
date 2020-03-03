import { Gate } from "./gate";
import { PathParams } from "express-serve-static-core"
import { Controller } from "../controller";
import { RequestValidation } from "../../validation/request-validation";
import { Route, RequestHandlerCallback } from "./route";
import { HttpMethod } from "./router.service";
import { FunctionHelper } from "../../../utils/FunctionHelper";
import * as path from "path";

export class RouterParser {
    protected _routes: Array<Route>;

    protected _gates: Array<typeof Gate>;
    protected _currentRoute: Route;
    protected _prefix: string;

    constructor() {
        this._gates = [];
        this._routes = [];
        this._currentRoute = null;
        this._prefix = "";
    }

    get routes(): Array<Route> {
        return this._routes;
    }

    public setGates(gates: Array<typeof Gate>): void {
        this._gates = gates;
    }

    public appendGates(gates: Array<typeof Gate>): void {
        this._gates = this._gates.concat(gates);
    }

    public setPrefix(prefix: string): void {
        this._prefix = prefix;
    }

    public appendPrefix(prefix: string): void {
        this._prefix = path.join(this._prefix, prefix);
    }

    public gates(gates: Array<typeof Gate>, callback: (router: RouterParser) => void): void {
        this.commitCurrentRoute();
        const parser = this.cloneRouterParser();
        parser.appendGates(this._gates.concat(gates));
        
        callback(parser);
        
        //Once callback is executed, we have to commit pending route
        parser.commitCurrentRoute();

        this._routes = this._routes.concat(parser.routes);
    }

    public prefix(prefix: string, callback: (router: RouterParser) => void): void {
        this.commitCurrentRoute();

        const parser = this.cloneRouterParser();

        parser.appendPrefix(prefix);

        callback(parser);

        parser.commitCurrentRoute();

        this._routes = this._routes.concat(parser.routes);
    }

    public post(pathParams: PathParams, controller: typeof Controller, method: string, validation?: typeof RequestValidation): RouterParser
    public post(pathParams: PathParams, controller: RequestHandlerCallback): RouterParser
    public post(pathParams: PathParams, controller: typeof Controller | RequestHandlerCallback, method?: string, validation?: typeof RequestValidation): RouterParser {
        this.newControllerHandler('POST', this.generatePathParamsWithPrefix(pathParams), controller, method, validation);
        return this;
    }

    public get(pathParams: PathParams, controller: typeof Controller, method: string, validation?: typeof RequestValidation): RouterParser
    public get(pathParams: PathParams, controller: RequestHandlerCallback): RouterParser
    public get(pathParams: PathParams, controller: typeof Controller | RequestHandlerCallback, method?: string, validation?: typeof RequestValidation): RouterParser {
        this.newControllerHandler('GET', this.generatePathParamsWithPrefix(pathParams), controller, method, validation);
        return this;
    }

    public all(pathParams: PathParams, controller: typeof Controller, method: string, validation?: typeof RequestValidation): RouterParser
    public all(pathParams: PathParams, controller: RequestHandlerCallback): RouterParser
    public all(pathParams: PathParams, controller: typeof Controller | RequestHandlerCallback, method?: string, validation?: typeof RequestValidation): RouterParser {
        this.newControllerHandler('ALL', this.generatePathParamsWithPrefix(pathParams), controller, method, validation);
        return this;
    }

    public options(pathParams: PathParams, controller: typeof Controller, method: string, validation?: typeof RequestValidation): RouterParser
    public options(pathParams: PathParams, controller: RequestHandlerCallback): RouterParser
    public options(pathParams: PathParams, controller: typeof Controller | RequestHandlerCallback, method?: string, validation?: typeof RequestValidation): RouterParser {
        this.newControllerHandler('OPTIONS', this.generatePathParamsWithPrefix(pathParams), controller, method, validation);
        return this;
    }

    public delete(pathParams: PathParams, controller: typeof Controller, method: string, validation?: typeof RequestValidation): RouterParser
    public delete(pathParams: PathParams, controller: RequestHandlerCallback): RouterParser
    public delete(pathParams: PathParams, controller: typeof Controller | RequestHandlerCallback, method?: string, validation?: typeof RequestValidation): RouterParser {
        this.newControllerHandler('DELETE', this.generatePathParamsWithPrefix(pathParams), controller, method, validation);
        return this;
    }

    public head(pathParams: PathParams, controller: typeof Controller, method: string, validation?: typeof RequestValidation): RouterParser
    public head(pathParams: PathParams, controller: RequestHandlerCallback): RouterParser
    public head(pathParams: PathParams, controller: typeof Controller | RequestHandlerCallback, method?: string, validation?: typeof RequestValidation): RouterParser {
        this.newControllerHandler('HEAD', this.generatePathParamsWithPrefix(pathParams), controller, method, validation);
        return this;
    }

    public patch(pathParams: PathParams, controller: typeof Controller, method: string, validation?: typeof RequestValidation): RouterParser
    public patch(pathParams: PathParams, controller: RequestHandlerCallback): RouterParser
    public patch(pathParams: PathParams, controller: typeof Controller | RequestHandlerCallback, method?: string, validation?: typeof RequestValidation): RouterParser {
        this.newControllerHandler('PATCH', this.generatePathParamsWithPrefix(pathParams), controller, method, validation);
        return this;
    }

    public put(pathParams: PathParams, controller: typeof Controller, method: string, validation?: typeof RequestValidation): RouterParser
    public put(pathParams: PathParams, controller: RequestHandlerCallback): RouterParser
    public put(pathParams: PathParams, controller: typeof Controller | RequestHandlerCallback, method?: string, validation?: typeof RequestValidation): RouterParser {
        this.newControllerHandler('PUT', this.generatePathParamsWithPrefix(pathParams), controller, method, validation);
        return this;
    }

    public name(name: string): RouterParser {
        this._currentRoute.setName(name);
        return this;
    }

    protected generatePathParamsWithPrefix(pathParams: PathParams): PathParams {
        if (this._prefix !== "" && pathParams instanceof RegExp) {
            throw new Error('Can not use prefix with regexp');
        }

        const pathParam: string = path.join(this._prefix, <string>pathParams);

        return pathParam.replace(/\/$/, ""); //Remove trailing slash if exists
    }

    protected newControllerHandler(httpMethod: HttpMethod, pathParams: PathParams, controller: typeof Controller | RequestHandlerCallback , method: string, validation?: typeof RequestValidation): Route {
        this.commitCurrentRoute();

        if (FunctionHelper.isCallback(controller)) {
            this._currentRoute = this.buildCallbackHandler(httpMethod, pathParams, this._gates, <RequestHandlerCallback>controller, validation);
            return this._currentRoute;
        }

        this._currentRoute = this.buildControllerHandlerRoute(httpMethod, pathParams,this._gates, <typeof Controller>controller, method, validation);
        return this._currentRoute;
    }

    public commitCurrentRoute() {
        if (this._currentRoute !== null) {
            this._routes.push(this._currentRoute);
            
            this._currentRoute = null;
        }
    }

    protected buildCallbackHandler(httpMethod: HttpMethod, pathParams: PathParams, gates: Array<typeof Gate>, callback: RequestHandlerCallback, validation?: typeof RequestValidation): Route {
        const route: Route = new Route().setHttpMethod(httpMethod).setPathParams(pathParams).setCallbackHandler(callback);

        route.setGates(gates);

        if (validation) {
            route.setRequestValidation(validation);
        }

        return route;
    }

    protected buildControllerHandlerRoute(httpMethod: HttpMethod, pathParams: PathParams, gates: Array<typeof Gate>, controller: typeof Controller, method: string, validation?: typeof RequestValidation): Route {
        const route: Route = new Route().setHttpMethod(httpMethod).setPathParams(pathParams).setControllerHandler({
            controller: controller,
            method: method
        });

        route.setGates(gates);

        if (validation) {
            route.setRequestValidation(validation);
        }

        return route;
    }

    protected cloneRouterParser(): RouterParser {
        const parser = new RouterParser();
        parser.setGates(this._gates);
        parser.setPrefix(this._prefix);

        return parser;
    }
}