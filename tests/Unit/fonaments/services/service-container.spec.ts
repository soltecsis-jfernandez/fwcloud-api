import { runApplication, randomString } from "../../../utils/utils";
import { ServiceContainer } from "../../../../src/fonaments/services/service-container"
import { Application } from "../../../../src/Application";
import { Service } from "../../../../src/fonaments/services/service";
import { AbstractApplication } from "../../../../src/fonaments/abstract-application";

let app: Application; 
beforeAll(async() => {
    app = await runApplication(false);
});

class TestService extends Service { 
    public tag: string;
}

describe('Request tests', () => {
    it('bind a service should include a service reference into the services array', async() => {
        const sc = new ServiceContainer(app)

        sc.bind(TestService.name, null);

        expect(sc.services).toEqual([
            {
                singleton: false,
                name: 'TestService',
                target: null,
                instance: null
            }
        ])
    });

    it('singleton a service should include a service reference with an instance', async() => {
        const sc = new ServiceContainer(app);
        sc.singleton(TestService.name, async (app: AbstractApplication) => new TestService(app));

        expect(await sc.get('TestService')).toEqual(new TestService(app));
    });

    it('get a bound service should return an instance of the service', async() => {
        const sc = new ServiceContainer(app);
        sc.bind(TestService.name, async (app: AbstractApplication) => new TestService(app));

        expect(await sc.get(TestService.name)).toEqual(new TestService(app));
    });

    it('get a singleton service should return the instance of the service', async () => {
        const sc = new ServiceContainer(app);
        
        sc.singleton(TestService.name, async (app: AbstractApplication) => {
            const c = new TestService(app);
            c.tag = randomString(10);
            return c;
        });

        expect((await sc.get(TestService.name)).tag).toEqual((await sc.get(TestService.name)).tag);
    });

    it('get a non singleton service should return a new instance of the service', async () => {
        const sc = new ServiceContainer(app);
        
        sc.bind(TestService.name, async (app: AbstractApplication) => {
            const c = new TestService(app);
            c.tag = randomString(10);
            return c;
        });

        expect((await sc.get(TestService.name)).tag).not.toEqual((await sc.get(TestService.name)).tag);
    });
});