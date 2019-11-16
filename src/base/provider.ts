import * as t from '@babel/types';
import traverse from '@babel/traverse';
import {Theme} from 'baseui/theme';
import {getAstJsxElement} from '../code-generator';
import {TProvider} from '../types';

export const getThemeFromContext = (theme: Theme, themeConfig: string[]) => {
  const componentThemeObj: {[key: string]: string} = {};
  themeConfig.forEach(key => {
    componentThemeObj[key] = (theme.colors as any)[key];
  });
  return componentThemeObj;
};

export const getActiveTheme = (
  values: {[key: string]: string},
  initialValues: {[key: string]: string}
) => {
  const activeValues: {[key: string]: string} = {};
  Object.keys(initialValues).forEach(key => {
    activeValues[key] = initialValues[key];
    if (values && values[key]) {
      activeValues[key] = values[key];
    }
  });
  return activeValues;
};

export const getThemeDiff = (
  values: {[key: string]: string},
  initialValues: {[key: string]: string}
) => {
  const diff: {[key: string]: string} = {};
  Object.keys(values).forEach(key => {
    if (initialValues[key] && values[key] && initialValues[key] !== values[key]) {
      diff[key] = values[key];
    }
  });
  return diff;
};

export const getProvider = (
  initialThemeValues: {[key: string]: string},
  themePrimitives: string
): TProvider => {
  return {
    value: undefined,
    parse: (astRoot: any) => {
      const newThemeValues: {[key: string]: string} = {};
      traverse(astRoot, {
        CallExpression(path) {
          if (
            //@ts-ignore
            path.node.callee.name === 'createTheme' &&
            path.node.arguments.length === 2 &&
            //@ts-ignore
            path.node.arguments[1].properties.length === 1
          ) {
            //@ts-ignore
            const colors = path.node.arguments[1].properties[0].value;
            colors.properties.forEach((prop: any) => {
              if (initialThemeValues[prop.key.name] !== prop.value.value) {
                newThemeValues[prop.key.name] = prop.value.value;
              }
            });
          }
        },
      });
      return Object.keys(newThemeValues).length > 0 ? newThemeValues : undefined;
    },
    generate: (value: any, childTree: t.JSXElement) => generate(value, childTree, themePrimitives),
    imports: {
      baseui: {
        named: ['ThemeProvider', 'createTheme', themePrimitives],
      },
    },
  };
};

export const generate = (
  values: {[key: string]: string},
  childTree: t.JSXElement,
  themePrimitives: string
) => {
  if (!values || Object.keys(values).length === 0) {
    return childTree;
  }
  return getAstJsxElement(
    'ThemeProvider',
    [
      t.jsxAttribute(
        t.jsxIdentifier('theme'),
        t.jsxExpressionContainer(
          t.callExpression(t.identifier('createTheme'), [
            t.identifier(themePrimitives),
            t.objectExpression([
              t.objectProperty(
                t.identifier('colors'),
                t.objectExpression(
                  Object.entries(values).map(([name, value]) =>
                    t.objectProperty(t.identifier(name), t.stringLiteral(value as string))
                  )
                )
              ),
            ]),
          ])
        )
      ),
    ],
    [childTree]
  );
};