import { StepScene, StepSceneHandler } from "@vk-io/scenes";
import { Context, MessageContext } from "vk-io";

export type SceneStepWithDependencies<
	T extends Context = MessageContext,
	S extends Record<string, any> = {},
	D extends Record<string, any> = {},
> = StepSceneHandler<T & { dependencies: D }, S>;

export function createScene<
	T extends Context = MessageContext,
	S extends Record<string, any> = {},
	D extends Record<string, any> = {},
>(
	slug: string,
	steps: SceneStepWithDependencies<T, S, D>[],
	opts?: {
		dependencies?: D;
		enterHandler?: SceneStepWithDependencies<T, S, D>;
		leaveHandler?: SceneStepWithDependencies<T, S, D>;
	}
): StepScene<T & { dependencies: D }, S> {
	return new StepScene(slug, {
		steps: steps,
		enterHandler: async (context) => {
			if (opts && opts.dependencies) {
				context.dependencies = opts.dependencies;
			}

			if (opts && opts.enterHandler) {
				await opts.enterHandler(context);
			}
		},
		leaveHandler: opts?.leaveHandler,
	});
}
