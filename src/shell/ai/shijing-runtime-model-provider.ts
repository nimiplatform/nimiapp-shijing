import {
  createRuntimeRouteModelPickerProviderCache,
  type RouteModelPickerDataProvider,
} from '@nimiplatform/kit/features/model-picker/runtime';
import {
  createNimiRuntimeRouteOptionsHostDeps,
  listNimiRuntimeRouteOptionsWithHost,
} from '@nimiplatform/sdk/runtime';
import { getShijingNimiClient } from '../infra/shijing-nimi-client.ts';

export function createShijingRuntimeModelPickerProviderCache(): (
  capability: string,
) => RouteModelPickerDataProvider | null {
  return createRuntimeRouteModelPickerProviderCache({
    loadOptions: async (input) => {
      const client = getShijingNimiClient();
      return listNimiRuntimeRouteOptionsWithHost(
        input,
        createNimiRuntimeRouteOptionsHostDeps(client.runtime),
      );
    },
    unavailableMessage: 'ShiJing Runtime route catalog is unavailable.',
  });
}
