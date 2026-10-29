import { Effect, Layer } from 'effect'
import { inMemoryUnitOfWork } from '../events/event-store-memory'
import { RunUnitOfWork, UnitOfWork } from '../events/unit-of-work'
import { CommandFailure, FormFailure, runCommand, runFormCommand } from './run-command'

/**
 * Runs a command as an action would, against the fakes the test provides
 * and an in-memory journal: a fresh one unless the test hands its own, to
 * seed it first or to look at what was written.
 */
export const runWith =
  <R>(fakes: Layer.Layer<R>) =>
  <A, E extends CommandFailure>(
    command: Effect.Effect<A, E, R | RunUnitOfWork>,
    unitOfWork: RunUnitOfWork = inMemoryUnitOfWork().run,
  ) =>
    runCommand(Effect.provide(command, Layer.merge(fakes, Layer.succeed(UnitOfWork, unitOfWork))))

/** The same, for a command behind a form: a field at fault is named */
export const runFormWith =
  <R>(fakes: Layer.Layer<R>) =>
  <A, E extends FormFailure>(
    command: Effect.Effect<A, E, R | RunUnitOfWork>,
    unitOfWork: RunUnitOfWork = inMemoryUnitOfWork().run,
  ) =>
    runFormCommand(
      Effect.provide(command, Layer.merge(fakes, Layer.succeed(UnitOfWork, unitOfWork))),
    )
