import { Entity } from './entity'
import { AggregateRootProperties } from './aggregate-root-properties'
import { Event } from '@node-ts/bus-messages'
import { FunctionNotFound } from './error/function-not-found'
import { pascal } from 'change-case'

type IndexedWith<TTarget> = TTarget & { [key: string]: (event: Event) => void }

/**
 * The root entity of an aggregate
 */
export abstract class AggregateRoot
  extends Entity
  implements AggregateRootProperties {

  /**
   * The current version of the aggreage after all updates have been applied. Each update of
   * the object, aka each time an event is applied, increments this value by one.
   */
  version: number

  /**
   * The version of the aggregate as it was when retrieved from the data store.
   */
  readonly fetchVersion: number

  private newEvents: Event[]

  constructor (id: string) {
    super(id)
    this.version = 0
    this.newEvents = []
  }

  when (event: Event): void {
    const localFunctionName = resolveLocalFunctionName(event)

    const indexedThis = this as IndexedWith<this>
    const localFunction = indexedThis[localFunctionName] as {}

    if (typeof localFunction !== 'function') {
      throw new FunctionNotFound(
        event,
        localFunctionName
      )
    }

    localFunction.call(this, event)

    this.addEvent(event)
  }

  get changes (): Event[] {
    return this.newEvents
  }

  private addEvent (event: Event): void {
    this.newEvents.push(event)
    this.version++
  }

}

function resolveLocalFunctionName (event: Event): string {
  const namespace = event.$name
  const nameParts = namespace.split('/')
  const name = nameParts[nameParts.length - 1]
  const pascalName = pascal(name)
  return `when${pascalName}`
}