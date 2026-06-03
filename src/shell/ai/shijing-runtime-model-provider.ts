import {
  createRuntimeRouteModelPickerProviderCache,
  type RouteModelPickerDataProvider,
  type RuntimeRouteModelPickerClient,
} from '@nimiplatform/kit/features/model-picker/runtime';
import { getPlatformClient } from '@nimiplatform/sdk';

export function createShijingRuntimeModelPickerProviderCache(): (
  capability: string,
) => RouteModelPickerDataProvider | null {
  return createRuntimeRouteModelPickerProviderCache({
    getClient: async () => getPlatformClient() as RuntimeRouteModelPickerClient,
    unavailableMessage: 'ShiJing Runtime route catalog is unavailable.',
  });
}
