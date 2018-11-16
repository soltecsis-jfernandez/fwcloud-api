var schema = {};
module.exports = schema;

const Joi = require('joi');
const sharedSch = require('./shared');

schema.validate = req => {
    return new Promise(async(resolve, reject) => {
        const item2 = req.url.split('/')[2];
        if (item2 === 'group' || item2 === 'types') {
            try {
                const item1 = req.url.split('/')[1];
                resolve(await require('./' + item1 + '/' + item2).validate(req));
            } catch (error) { return reject(error) }
        }

        var schema = Joi.object().keys({ fwcloud: sharedSch.id });

        var valid_types = [1, 2, 3, 4, 5, 6, 7, 8, 20, 21];

        if (req.method === 'POST' || (req.method === 'PUT' && req.url === '/ipobj')) {
            schema = schema.append({
                fwcloud: sharedSch.id,
                name: sharedSch.name,
                type: sharedSch.u8bits.valid(valid_types),
                interface: sharedSch.id.allow(null).optional(),
                diff_serv: Joi.number().port().optional(),
                options: Joi.number().integer().optional(),
                comment: sharedSch.comment.optional()
            });

            // We will have different schemas depending upon the req.body.type parameter.
            // Verify that this parameters, exists, is number and has the accepted values.
            if (req.body.type === undefined || req.body.type === null ||
                typeof req.body.type !== "number" ||
                valid_types.findIndex(function(type) {
                    return type == req.body.type;
                }) == -1)
                return reject(new Error('Bad value in req.body.type'));

            switch (req.body.type) {
                case 1: // IP
                    schema = schema.append({
                        protocol: sharedSch.u8bits.optional()
                    });
                    break;

                case 2: // TCP
                    schema = schema.append({
                        source_port_start: Joi.number().port(),
                        source_port_end: Joi.number().port(),
                        destination_port_start: Joi.number().port(),
                        destination_port_end: Joi.number().port(),
                        tcp_flags_mask: sharedSch.u8bits.optional(),
                        tcp_flags_settings: sharedSch.u8bits.optional()
                    });
                    break;

                case 3: // ICMP
                    schema = schema.append({
                        icmp_code: sharedSch.u8bits,
                        icmp_type: sharedSch.u8bits
                    });
                    break;

                case 4: // UDP
                    schema = schema.append({
                        source_port_start: Joi.number().port(),
                        source_port_end: Joi.number().port(),
                        destination_port_start: Joi.number().port(),
                        destination_port_end: Joi.number().port()
                    });
                    break;

                case 5: // ADDRESS
                    schema = schema.append({
                        ip_version: Joi.number().integer().valid([4, 6]),
                        address: Joi.alternatives().when('ip_version', { is: 4, then: sharedSch.ipv4, otherwise: sharedSch.ipv6 }),
                        netmask: Joi.alternatives().when('ip_version', { is: 4, then: sharedSch.ipv4, otherwise: sharedSch.ipv6 }).optional()
                    });
                    break;

                case 6: // ADDRESS RANGE
                    schema = schema.append({
                        ip_version: Joi.number().integer().valid([4, 6]),
                        range_start: Joi.alternatives().when('ip_version', { is: 4, then: sharedSch.ipv4, otherwise: sharedSch.ipv6 }),
                        range_end: Joi.alternatives().when('ip_version', { is: 4, then: sharedSch.ipv4, otherwise: sharedSch.ipv6 })
                    });
                    break;
                case 7: // NETWORK
                    schema = schema.append({
                        ip_version: Joi.number().integer().valid([4, 6]),
                        address: Joi.alternatives().when('ip_version', { is: 4, then: sharedSch.ipv4, otherwise: sharedSch.ipv6 }).optional(),
                        netmask: Joi.alternatives().when('ip_version', { is: 4, then: sharedSch.ipv4, otherwise: sharedSch.ipv6 })
                    });
                    break;
                case 8: // HOST
                    break;
                case 20: // GROUP
                    break;
                case 21: // SERVICE GROUP
                    break;

            }

            if (req.method === 'PUT') schema = schema.append({ id: sharedSch.id });
            else if (req.method === 'POST') schema = schema.append({ node_parent: sharedSch.id, node_order: sharedSch.id, node_type: sharedSch.name }); // node_type is an string
        } else if (req.method === 'PUT') {
            if (req.url === '/ipobj/get')
                schema = schema.append({ id: sharedSch.id });
            else if (req.url === '/ipobj/del' || req.url === '/ipobj/where' || req.url === '/ipobj/restricted')
                schema = schema.append({ id: sharedSch.id, type: sharedSch.id });
        } else return reject(new Error('Request method not accepted'));

        try {
            await Joi.validate(req.body, schema, sharedSch.joiValidationOptions);

            // Semantic validation.
            if (req.method === 'POST' || (req.method === 'PUT' && req.url === '/ipobj')) {
                if (req.body.source_port_start > req.body.source_port_end)
                    throw (new Error('Source port end must be greater or equal than source port start'));
                if (req.body.destination_port_start > req.body.destination_port_end)
                    throw (new Error('Destination port end must be greater or equal than destination port start'));
            }

            resolve();
        } catch (error) { return reject(error) }
    });
};