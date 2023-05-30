/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { get, isEmpty } from 'lodash';
import { Vis } from '../../../../plugins/visualizations/public';
import {
  formatExpression,
  buildExpressionFunction,
  buildExpression,
  ExpressionAstFunctionBuilder,
} from '../../../../plugins/expressions/public';
import {
  ISavedAugmentVis,
  SavedAugmentVisLoader,
  VisLayerFunctionDefinition,
  VisLayer,
  isVisLayerWithError,
} from '../';
import { PLUGIN_AUGMENTATION_ENABLE_SETTING } from '../../common/constants';
import { getUISettings } from '../services';
import { IUiSettingsClient } from '../../../../core/public';

export const isEligibleForVisLayers = (vis: Vis): boolean => {
  // Only support date histogram and ensure there is only 1 x-axis and it has to be on the bottom.
  // Additionally to have a valid x-axis, there needs to be a segment aggregation
  const hasValidXaxis =
    vis.data.aggs !== undefined &&
    vis.data.aggs?.byTypeName('date_histogram').length === 1 &&
    vis.params.categoryAxes.length === 1 &&
    vis.params.categoryAxes[0].position === 'bottom' &&
    vis.data.aggs?.bySchemaName('segment').length > 0;
  // Support 1 segment for x axis bucket (that is date_histogram) and support metrics for
  // multiple supported yaxis only. If there are other aggregation types, this is not
  // valid for augmentation
  const hasCorrectAggregationCount =
    vis.data.aggs !== undefined &&
    vis.data.aggs?.bySchemaName('metric').length > 0 &&
    vis.data.aggs?.bySchemaName('metric').length === vis.data.aggs?.aggs.length - 1;
  const hasOnlyLineSeries =
    vis.params.seriesParams.every((seriesParam: { type: string }) => seriesParam.type === 'line') &&
    vis.params.type === 'line';
  // Checks if the augmentation setting is enabled
  const config = getUISettings();
  const isAugmentationEnabled = config.get(PLUGIN_AUGMENTATION_ENABLE_SETTING);
  return isAugmentationEnabled && hasValidXaxis && hasCorrectAggregationCount && hasOnlyLineSeries;
};

/**
 * Using a SavedAugmentVisLoader, fetch all saved objects that are of 'augment-vis' type
 * and filter out to return the ones associated to the particular vis via
 * matching vis ID.
 */
export const getAugmentVisSavedObjs = async (
  visId: string | undefined,
  loader: SavedAugmentVisLoader | undefined,
  uiSettings?: IUiSettingsClient | undefined
): Promise<ISavedAugmentVis[]> => {
  // Using optional services provided, or the built-in services from this plugin
  const config = uiSettings !== undefined ? uiSettings : getUISettings();
  const isAugmentationEnabled = config.get(PLUGIN_AUGMENTATION_ENABLE_SETTING);
  if (!isAugmentationEnabled) {
    throw new Error(
      'Visualization augmentation is disabled, please enable visualization:enablePluginAugmentation.'
    );
  }
  try {
    const resp = await loader?.findAll();
    const allSavedObjects = (get(resp, 'hits', []) as any[]) as ISavedAugmentVis[];
    return allSavedObjects.filter((hit: ISavedAugmentVis) => hit.visId === visId);
  } catch (e) {
    return [] as ISavedAugmentVis[];
  }
};

/**
 * Given an array of augment-vis saved objects that contain expression function details,
 * construct a pipeline that will execute each of these expression functions.
 * Note that the order does not matter; each expression function should be taking
 * in the current output and appending its results to it, such that the end result
 * contains the results from each expression function that was ran.
 */
export const buildPipelineFromAugmentVisSavedObjs = (objs: ISavedAugmentVis[]): string => {
  try {
    const visLayerExpressionFns = objs.map((obj: ISavedAugmentVis) =>
      buildExpressionFunction<VisLayerFunctionDefinition>(
        obj.visLayerExpressionFn.name,
        obj.visLayerExpressionFn.args
      )
    ) as Array<ExpressionAstFunctionBuilder<VisLayerFunctionDefinition>>;
    const ast = buildExpression(visLayerExpressionFns).toAst();
    return formatExpression(ast);
  } catch (e) {
    throw new Error('Expression function from augment-vis saved objects could not be generated');
  }
};

/**
 * Returns an error with an aggregated message about all of the
 * errors found in the set of VisLayers. If no errors, returns undefined.
 */
export const getAnyErrors = (visLayers: VisLayer[], visTitle: string): Error | undefined => {
  const visLayersWithErrors = visLayers.filter((visLayer) => isVisLayerWithError(visLayer));
  if (!isEmpty(visLayersWithErrors)) {
    // Aggregate by unique plugin resource type
    const resourceTypes = [
      ...new Set(visLayersWithErrors.map((visLayer) => visLayer.pluginResource.type)),
    ];

    let msgDetails = '';
    resourceTypes.forEach((type, index) => {
      const matchingVisLayers = visLayersWithErrors.filter(
        (visLayer) => visLayer.pluginResource.type === type
      );
      if (index !== 0) msgDetails += '\n\n\n';
      msgDetails += `-----${type}-----`;
      matchingVisLayers.forEach((visLayer, idx) => {
        if (idx !== 0) msgDetails += '\n';
        msgDetails += `\nID: ${visLayer.pluginResource.id}`;
        msgDetails += `\nMessage: "${visLayer.error?.message}"`;
      });
    });

    const err = new Error(`Certain plugin resources failed to load on the ${visTitle} chart`);
    // We set as the stack here so it can be parsed and shown cleanly in the details modal coming from the error toast notification.
    err.stack = msgDetails;
    return err;
  } else {
    return undefined;
  }
};
