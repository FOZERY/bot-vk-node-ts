import { Keyboard, type MessageContext } from "vk-io";
import {
	attachTextButtonToKeyboard,
	leaveButtonOptions,
} from "../../../../shared/utils/keyboard-utils.js";
import { logStep } from "../../../../shared/utils/logger-messages.js";
import type { SceneStepWithDependencies } from "../../../../shared/utils/scene-utils.js";
import {
	selectEventKeyboard,
	type SelectEventKeyboardPayload,
} from "../../../keyboards/select-event.keyboard.js";
import type { DeleteEventSceneDependencies, DeleteEventSceneState } from "../delete-event.scene.js";

export const findEventStep: SceneStepWithDependencies<
	MessageContext,
	DeleteEventSceneState,
	DeleteEventSceneDependencies
> = async (context) => {
	if (context.scene.step.firstTime) {
		logStep(context, `User ${context.senderId} -> entered find-event step`, "info");

		return await context.send(
			`
Используй сообщение для поиска события, которое хочешь удалить (искать можно по дате, названию организатору).`,
			{
				keyboard: attachTextButtonToKeyboard(Keyboard.builder(), [leaveButtonOptions]),
			}
		);
	}

	if (!context.text) {
		return await context.reply(
			"Разрешено вводить только текст, либо пользоваться клавиатурой."
		);
	}

	if (context.hasMessagePayload) {
		// если ввели с клавиатуры
		switch (context.messagePayload.command) {
			case "leave": {
				return await context.scene.leave();
			}
			case "selectEvent": {
				const { eventId } = context.messagePayload as SelectEventKeyboardPayload;
				logStep(
					context,
					`User ${context.senderId} -> selected event with id ${eventId}`,
					{
						event: context.scene.state.event,
					},
					"info"
				);

				const event = await context.dependencies.eventsService.findEventById(eventId);

				if (!event) {
					logStep(context, `User ${context.senderId} -> event not found`, "info");
					return await context.reply("Событие не найдено.");
				}

				context.scene.state.event = {
					id: event.id,
					title: event.title,
					date: event.date,
					timeRange: event.timeRange,
					place: event.place,
					organizer: event.organizer,
					createdAt: event.createdAt,
					updatedAt: event.updatedAt,
					lastUpdaterId: event.lastUpdaterId,
				};
				break;
			}
			default: {
				logStep(context, `Unknown command: ${context.messagePayload.command}`, "error");
				throw new Error(`Unknown command: ${context.messagePayload.command}`);
			}
		}
	} else {
		// если ввели текст
		const trimmedText = context.text.trim();

		const result =
			await context.dependencies.eventsService.findEventsByTitleOrDate(trimmedText);
		if (result.isErr()) {
			logStep(
				context,
				`User ${context.senderId} -> error while finding events`,
				"error",
				result.error
			);
			return await context.send("Ошибка сервера.");
		}

		if (result.value.length === 0) {
			logStep(context, `User ${context.senderId} -> events not found`, "info");
			return await context.send("События не найдены.");
		}

		return await context.send("Выбери событие для удаления, либо продолжи поиск.", {
			keyboard: attachTextButtonToKeyboard(selectEventKeyboard(result.value), [
				leaveButtonOptions,
			]),
		});
	}

	logStep(context, `User ${context.senderId} -> passed find-event step`, "info");
	return await context.scene.step.next();
};
