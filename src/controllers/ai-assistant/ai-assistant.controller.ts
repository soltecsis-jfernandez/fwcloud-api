import { Request, Response } from 'express';
import { Controller } from '../../fonaments/http/controller';
import { ResponseBuilder } from '../../fonaments/http/response-builder';
import { Validate } from '../../decorators/validate.decorator';
import { AIAssistantService } from '../../models/ai-assistant/ai-assistant.service';
import { AiAssistantDto } from './dto/ai-assistant.dto';
import { Firewall } from '../../models/firewall/Firewall';
import { FwCloud } from '../../models/fwcloud/FwCloud';
import db from '../../database/database-manager';

export class AIassistantController extends Controller {
  private _aiAssistantService: AIAssistantService;
  protected _firewall: Firewall;
  protected _fwCloud: FwCloud;

  public async make(req: Request): Promise<void> {
    this._aiAssistantService = await this._app.getService<AIAssistantService>(
      AIAssistantService.name,
    );

    if (req.params.firewall) {
      this._firewall = await db
        .getSource()
        .manager.getRepository(Firewall)
        .findOneOrFail({ where: { id: parseInt(req.params.firewall) } });
    }
    if (req.params.fwcloud) {
      this._fwCloud = await db
        .getSource()
        .manager.getRepository(FwCloud)
        .findOneOrFail({ where: { id: parseInt(req.params.fwcloud) } });
    }
  }

  @Validate()
  public async getConfig(req: Request, res: Response): Promise<ResponseBuilder> {
    try {
      const config = await this._aiAssistantService.getAiCredentials();

      if (!config) {
        return ResponseBuilder.buildResponse()
          .status(404)
          .body({ error: 'No AI assistant configuration found.' });
      } else {
        return ResponseBuilder.buildResponse().status(200).body(config);
      }
    } catch (error) {
      return ResponseBuilder.buildResponse()
        .status(500)
        .body({ error: 'Failed to fetch AI assistant configuration.' });
    }
  }

  @Validate(AiAssistantDto)
  public async updateConfig(req: Request, res: Response): Promise<void> {
    try {
      const config = this._aiAssistantService.upateOrCreateAiCredentials(
        req.body.ai,
        req.body.model,
        req.body.apiKey,
      );
      res.status(200).send(config);
    } catch (error) {
      res.status(500).send({ error: 'Failed to update AI assistant configuration.' });
    }
  }

  @Validate(AiAssistantDto)
  public async deleteConfig(req: Request, res: Response): Promise<void> {
    try {
      const config = this._aiAssistantService.deleteAiCredentials(req.body);
      res.status(200).send(config);
    } catch (error) {
      res.status(500).send({ error: 'Failed to delete AI assistant configuration.' });
    }
  }

  @Validate(AiAssistantDto)
  public async checkPolicyScript(req: Request, res: Response): Promise<ResponseBuilder> {
    try {
      const { prompt } = req.body;
      if (!prompt) {
        res.status(400).send({ error: 'Prompt text is required.' });
        return;
      }

      const policyScript = await this._aiAssistantService.getPolicyScript(
        parseInt(req.params.fwcloud),
        parseInt(req.params.firewall),
      );

      const response = await this._aiAssistantService.getResponse(prompt + '\n' + policyScript);

      console.log(response);
      return ResponseBuilder.buildResponse().status(200).body(response);
    } catch (error) {
      console.error('Error:', error);
      return error;
    }
  }

  @Validate(AiAssistantDto)
  public async getResponse(req: Request, res: Response): Promise<void> {
    try {
      const { prompt } = req.body;
      if (!prompt) {
        res.status(400).send({ error: 'Prompt text is required.' });
        return;
      }
      const response = await this._aiAssistantService.getResponse(prompt);

      res.status(200).send({ response });
    } catch (error) {
      res.status(500).send({ error: 'Failed to fetch response from OpenAI.' });
    }
  }
}
