const fs = require("fs");
const config = require("./config.json");
const os = require("os");
const Discord = require("discord.js");
const request = require("request");
const htmlparser = require("htmlparser2");
const moment = require("moment");
const bot = new Discord.Client();
const dictionary = new RegExp(require("./profanityDictionary.js").join('|'), 'gi');
const whitelist = new RegExp(require("./whitelistedWords.js").join('|'), 'gi');
const ytregex = new RegExp(/http(?:s?):\/\/(?:www\.)?youtu(?:be\.com\/watch\?v=|\.be\/)([\w\-\_]*)(&(amp;)?‌​[\w\?‌​=]*)?/gi);
const imgregex = new RegExp(/(http)?s?:?(\/\/[^"']*\.(?:png|jpg|jpeg|gif|png|svg))/i);
const fileimgregex = new RegExp(/\.(gif|jpe?g|tiff|png|webp|bmp)$/i);
const imgurregex = new RegExp(/(?:https?:\/\/)?(?:i\.)?imgur\.com\/(?:gallery\/)?(.+(?=[sbtmlh]\..{3,4})|.+(?=\..{3,4})|.+?(?:(?=\s)|$))/i);
//(?:https?:\/\/)?(?:www\.)?youtu\.?be(?:\.com)?\/?.*(?:watch|embed)?(?:.*v=|v\/|\/)([\w\-_]+)\&?
const mentionText = config["mentionText"];

let textChannel;
let guild;
let serverName;
let memberRole;

const commands = [
	{
		command: "rules",
		description: "Lists the rules",
		parameters: [],
		execute(message, params) {
			textChannel.send("Read #rules");
		}
	},

	{
		command: "help",
		description: "Displays this message",
		parameters: [],
		execute(message) {
			let response = "Available commands:";
			commands.sort((a, b) => {
				const commandA = a.command.toUpperCase();
				const commandB = b.command.toUpperCase();
				if (commandA < commandB) {
					return -1;
				}
				if (commandA > commandB) {
					return 1;
				}
				return 0;
			});
			for (let i = 0; i < commands.length; i++) {
				const c = commands[i];

				response += "\n" + config["delimiter"] + c.command;

				for (let j = 0; j < c.parameters.length; j++) {
					response += " <" + c.parameters[j] + ">";
				}

				response += ": " + c.description;
			}
			message.reply(response);
		}
	},

	{
		command: "links",
		description: "Lists links to us",
		parameters: [],
		execute(message, params) {
			textChannel.send("Subscribe to Exotic https://goo.gl/9ZSmur\n\nFollow Exotic on Twitter https://twitter.com/BenWhitehurst5\n\nFollow The_G0dPiXeL (The Creator of this Bot) on Twitter https://twitter.com/thegodpixelreal\n\nSubscribe to The_G0dPiXeL (The Creator of this Bot) https://goo.gl/KfYzWb");
		}
	},

	{
		command: "subcount",
		description: "How many subs we got",
		parameters: [],
		execute(message, params) {
			request("https://www.youtube.com/channel/UCE4gr_SyM51x7H0kAGb52fg", (error, response, body) => {
				var parser = new htmlparser.Parser({
					onopentag: function(name, attribs){
						if(name === "span" && attribs.class === "yt-subscription-button-subscriber-count-branded-horizontal subscribed yt-uix-tooltip"){
							console.log(attribs.title);
							textChannel.send("Exotic's Current Sub Count: " + attribs.title + "\n\nHelp make that number bigger!");
						}
					}
				}, {decodeEntities: true});
				parser.write(body);
				parser.end();
			});
		}
	}
];

function searchCommand(commandName) {
	for (let i = 0; i < commands.length; i++) {
		if (commands[i].command === commandName.toLowerCase()) {
			return commands[i];
		}
	}

	return false;
}


function handleCommand(message, text) {
	const params = text.split(" ");
	const command = searchCommand(params[0]);

	if (command && command.dm && message.channel.type !== "dm") {
		message.delete();
		message.author.sendMessage("Command only allowed via DM");
		return;
	}
	//
	// if (!permissions.checkPermission(message.author.id, command.command)) {
	// 	message.delete()
	// 		.catch(console.error);
	// 	message.channel.sendMessage(message.author.username + " doesn\"t have permission to execute " + command.command + "!");
	// 	log.warning("User " + message.author.username + " (" + message.author.id + ") tried to use the command " + command.command + " but has insufficient permissions");
	// 	return;
	// }

	if (command) {
		if (command.nullableParameters == true) {
			command.execute(message, params);
		} else {
			if (params.length - 1 < command.parameters.length) {
				message.delete()
					.catch(console.error);
				let paramsString = "";
				for (let i = 0; i < command.parameters.length; i++) {
					paramsString += "[" + command.parameters[i] + "] ";
				}
				message.reply("Insufficient parameters!\n!" + command.command + " " + paramsString.trim());
			} else {
				command.execute(message, params);
				if (command.deleteAfter) {
					message.delete();
				}
			}
		}
	}
}

function christianServerProtecter(message) {
	if (message.channel.nsfw) {
		return false;
	} else {
		if (message.content.match(dictionary)) {
			if (message.content.match(whitelist)) {
				return false;
			} else {
				console.log("Detected bad word in: " + message.content + ", Author: " + message.author.username);
				log(moment().format("MM/DD/YYYY-h:mm:ss A") +" | Detected bad word in: " + message.content + ", Author: " + message.author.username + "\n");
				return true;
			}
		}

		if ((message.channel.name !== "uploads" && message.author.tag !== "7483") || message.channel.name !== "advertising" || message.channel.name !== "announcements") {
			if (message.content.match(ytregex)) {
				return true;
			}
		}

		if ((message.channel.name !== "uploads" && message.author.tag !== "7483") || message.channel.name !== "advertising" || message.channel.name !== "media" || message.channel.name !== "announcements") {
			if (message.content.match(imgurregex)) {
				return true;
			}

			if (message.content.match(imgregex)) {
				return true;
			}
		}

		if (message.attachments.find(val => val.filename.match(fileimgregex)) && message.channel.name !== "advertising" && message.channel.name !== "media" && message.channel.name !== "manager-only" && (message.channel.name !== "uploads" && message.author.tag !== "7483")) {
			return true;
		}

		return false;
	}
}

function log(message) {
	fs.appendFileSync("./log.txt", message);
}

bot.on("guildMemberAdd", event => {
	console.log("New member: " + event.user.username + ", Joined on: " + moment().format("MM/DD/YYYY-h:mm:ss A"));
	event.addRole(memberRole);
});

bot.on("disconnect", event => {
	console.log("Disconnected: " + event.reason + " (" + event.code + ")");
});

bot.on("message", message => {
	textChannel = message.channel;
	if ((message.channel.type !== "dm" && message.author.id !== bot.user.id) && (message.channel.type === "text" && message.channel.name === textChannel.name)) {
		if (christianServerProtecter(message)) {
			message.delete();
		} else {
			if (message.mentions.users.find(val => val.id === bot.user.id)) {
				message.reply(mentionText);
			} else {
				const messageText = message.content;
				if (messageText[0] === config["delimiter"]) { // Command issued
					handleCommand(message, messageText.substring(1));
				}
			}
		}
	}
});

serverName = config["server"];
var textChannelId = config["initialTextChannel"];
bot.on("ready", () => {
	var server = bot.guilds.find("name", serverName);
	guild = server;
	if (server === null) {
		throw new Error("Couldn't find server " + serverName);
	}

	textChannel = server.channels.find(chn => chn.name === textChannelId && chn.type === "text"); // The text channel the bot will use to announce stuff
	if (textChannel === null) {
		throw new Error("Couldn't find text channel #" + textChannelId + " in server " + serverName);
	}

	//checkForRole();
	bot.user.setActivity(config["game"]);
	console.log("Bot has started and is connected!");

	memberRole = guild.roles.find("name", "Member");
});

bot.login(config["bot_token"]);
