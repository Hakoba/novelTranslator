import { definePreset } from "@primeuix/themes"
import Aura from "@primeuix/themes/aura"

/**
 * Янтарь из иконки расширения вместо изумруда Aura: это тот же цвет, которым
 * на странице горит новое слово (`--color-mark-new` в `assets/base.css`), —
 * интерфейс и текст говорят одним цветом. Шкала построена вокруг него,
 * 500 — он и есть.
 *
 * `contrastColor` переопределён обязательно: у Aura на кнопке белая подпись,
 * а на светло-жёлтом фоне она даёт контраст меньше 2:1 и не читается.
 */
export const eruditTheme = definePreset(Aura, {
  /*
   * Изумруд Aura рядом с янтарём кричит, поэтому зелёный тоже свой — шалфей
   * из иконки (`--color-mark-saved`), тот же, которым помечено сохранённое слово.
   * Кнопку «Знал» он красит через severity="success".
   */
  primitive: {
    green: {
      50: "#f1f9f4",
      100: "#dff1e6",
      200: "#c5e2d0",
      300: "#a7d2b7",
      400: "#92c4a4",
      500: "#7fb894",
      600: "#5da879",
      700: "#438960",
      800: "#35694c",
      900: "#2b503b",
      950: "#152e20",
    },
  },
  components: {
    button: {
      colorScheme: {
        light: {
          /*
           * Заливка сдвинута на два шага темнее, чем у Aura: на светлом шалфее
           * белая подпись даёт 2.3:1 и не читается. На 700 выходит 5.5:1.
           * Тёмной теме это не нужно — там Aura и так кладёт тёмные чернила
           * на светлую заливку.
           */
          root: {
            success: {
              background: "{green.700}",
              hoverBackground: "{green.800}",
              activeBackground: "{green.900}",
              borderColor: "{green.700}",
              hoverBorderColor: "{green.800}",
              activeBorderColor: "{green.900}",
            },
          },
        },
      },
    },
  },
  semantic: {
    primary: {
      50: "#fefaee",
      100: "#fdf4d9",
      200: "#f9e7b3",
      300: "#f4d585",
      400: "#f1c965",
      500: "#eebd4a",
      600: "#dfa126",
      700: "#b47d1d",
      800: "#8c5f1d",
      900: "#6e4c1c",
      950: "#3f2a0d",
    },
    colorScheme: {
      light: {
        primary: {
          color: "{primary.500}",
          contrastColor: "{surface.900}",
          hoverColor: "{primary.600}",
          activeColor: "{primary.700}",
        },
      },
      dark: {
        primary: {
          color: "{primary.400}",
          contrastColor: "{surface.950}",
          hoverColor: "{primary.300}",
          activeColor: "{primary.200}",
        },
      },
    },
  },
})
