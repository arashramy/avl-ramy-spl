var nodemailer = require('nodemailer');
var path = require('path');
var templatesDir = path.resolve(__dirname, '..', 'template');
var emailTemplates = require('email-templates');
var EmailAddressRequiredError = new Error('email address required');

var util =
{
	send_email : function (templateName, locals, fn)
    {
        if (!locals.email)
        {
            return fn(EmailAddressRequiredError);
        }
        if (!locals.subject)
        {
            return fn(EmailAddressRequiredError);
        }

        emailTemplates(templatesDir, function (err, template)
        {
            if (err)
            {
              return fn(err);
            }

            template(templateName, locals, function (err, html, text)
            {
                if (err)
                {
                    return fn(err);
                }
                const transport = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: 'KavehGlassAVL@gmail.com',
                        pass: 'hlsrmhdnsxizqffp',
                    },
                });

                transport.sendMail(
                    {
                        from: "KavehGlassAVL@gmail.com",
                        to: locals.email,
                        subject: locals.subject,
                        html: html,
                        text: text
                    },
                    function (err, responseStatus)
                    {
                        if (err)
                        {
                            return fn(err);
                        }
                        return fn(null, responseStatus.message);
                    }
                );
            });
        });
    },

	add_parents_count : function(is_agent,first_parent_id) {
        var AgentModel = require("../models/agent").AgentModel;
        var parent_id = (first_parent_id) ? first_parent_id : '';
        var model = AgentModel.findOne({user: parent_id}).exec(function (err, agent) {
            if (err || !agent || !agent.parent) {
                return console.log("err", err);
            }
            else {
                if (!is_agent) {
                    agent.customerCount += 1;
                }
                else {
                    agent.subAgentsCount += 1;
                }
                agent.save();
                return util.add_parents_count(is_agent, agent.parent)
            }
        })
    }
}

module.exports.util = util;
