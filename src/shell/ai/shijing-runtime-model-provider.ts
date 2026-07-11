import {
  createRuntimeRouteModelPickerProviderCache,
  type RouteModelPickerDataProvider,
} from '@nimiplatform/kit/features/model-picker/runtime';

export function createShijingRuntimeModelPickerProviderCache(): (
  capability: string,
) => RouteModelPickerDataProvider | null {
  return createRuntimeRouteModelPickerProviderCache({
    loadOptions: async (input) => {
      void input;
      throw new Error('ShiJing protected Runtime route catalog operation is not admitted.');
    },
    unavailableMessage: 'ShiJing Runtime route catalog is unavailable.',
  });
}
