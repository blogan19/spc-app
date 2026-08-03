export type StepPlacement = 'top' | 'bottom' | 'left' | 'right' | 'center';

export interface WalkthroughStep {
  title: string;
  body: string;
  target?: string;           // value of data-tour attribute on the element to spotlight
  placement?: StepPlacement; // defaults to 'bottom' when target is set, 'center' otherwise
}

export interface WalkthroughDef {
  id: string;
  name: string;
  steps: WalkthroughStep[];
}

export const WALKTHROUGHS: Record<string, WalkthroughDef> = {

  welcome: {
    id: 'welcome',
    name: 'Welcome tour',
    steps: [
      {
        title: 'Welcome to the NHS dashboard tool',
        body: 'Build charts and KPIs from your own data, create presentations, and share read-only links — all without leaving the browser. Take a 30-second tour to get oriented.',
        placement: 'center',
      },
      {
        title: 'Start with your data',
        body: 'Click "Data" to upload a CSV file. Your data never leaves the browser — all processing happens on your device. The data is saved with the dashboard when you export it.',
        target: 'data-button',
        placement: 'bottom',
      },
      {
        title: 'Browse templates and examples',
        body: '"Templates" give you a blank NHS-formatted dashboard to fill with your own data. "Examples" are fully built with synthetic data — great for seeing what\'s possible before you start.',
        target: 'templates-button',
        placement: 'bottom',
      },
      {
        title: 'Add charts and tiles',
        body: 'Once you have data, click the dashed "+ Add tile" area on the canvas to create charts, KPI cards, tables, and more. Click any tile to edit it.',
        target: 'add-tile-placeholder',
        placement: 'top',
      },
      {
        title: 'Share and present',
        body: '"Present" creates a guided dashboard walkthrough or a full slide deck. The "•••" menu has sharing, embedding, snapshots, and theme options.',
        target: 'present-button',
        placement: 'bottom',
      },
    ],
  },

  upload: {
    id: 'upload',
    name: 'Uploading data',
    steps: [
      {
        title: 'Upload your data here',
        body: 'Drag and drop a CSV file, or click "Upload CSV" to browse. Column types (date, number, text) are detected automatically — you can change them if needed.',
        placement: 'center',
      },
      {
        title: 'Your data stays in the browser',
        body: 'Nothing is sent to a server. Data is included in your dashboard when you save it as a JSON file and when you copy a share link.',
        placement: 'center',
      },
    ],
  },

  addChart: {
    id: 'addChart',
    name: 'Adding your first chart',
    steps: [
      {
        title: 'Choose a chart type',
        body: 'Pick the chart that fits your data. Not sure? Try "Help me choose" for a guided recommendation based on what you\'re trying to show.',
        placement: 'center',
      },
      {
        title: 'Map columns to axes',
        body: 'Select which column goes on each axis using the dropdowns. The chart previews live as you change the settings — no guesswork needed.',
        placement: 'center',
      },
      {
        title: 'Save to add it to the dashboard',
        body: 'Click "Add to dashboard" to place the chart as a tile. You can resize and reposition it by dragging, and click it any time to edit the settings.',
        placement: 'center',
      },
    ],
  },

  spcChart: {
    id: 'spcChart',
    name: 'Reading an SPC chart',
    steps: [
      {
        title: 'What is an SPC chart?',
        body: 'Statistical Process Control (SPC) charts show whether variation in your data is normal (random noise) or a genuine signal. This helps you avoid reacting to noise and ensures you act on real change.',
        placement: 'center',
      },
      {
        title: 'Control limits (UCL and LCL)',
        body: 'The upper and lower control limits define the expected range of normal variation. Points outside these limits — or patterns like 7 in a row on one side — are signals worth investigating.',
        placement: 'center',
      },
      {
        title: 'Recalculate after an intervention',
        body: 'If you make a significant change to the process, tick "Recalculate from here" on that data point. The centre line and limits shift to reflect the new process — this is how you demonstrate sustained improvement.',
        placement: 'center',
      },
    ],
  },

  present: {
    id: 'present',
    name: 'Presenting your dashboard',
    steps: [
      {
        title: 'Two ways to present',
        body: '"Dashboard story" guides your audience through tiles with commentary — ideal for committee meetings where you\'re walking the room through live data. "Slide deck" lets you build standalone PowerPoint-style slides.',
        placement: 'center',
      },
      {
        title: 'Story mode — step by step',
        body: 'In story mode, each step focuses on one tile and dims the rest. Add commentary text that appears alongside the chart. Navigate with arrow keys or the on-screen buttons.',
        placement: 'center',
      },
      {
        title: 'Keyboard navigation',
        body: 'In both modes: arrow keys move between steps or slides, "N" toggles speaker notes, and Escape exits the presentation. Presenter clickers (left/right buttons) work too.',
        placement: 'center',
      },
    ],
  },

  share: {
    id: 'share',
    name: 'Sharing your dashboard',
    steps: [
      {
        title: 'Share link — no server needed',
        body: 'The share link compresses your entire dashboard into the URL. Anyone with the link can view it in their browser in read-only mode — they don\'t need an account.',
        placement: 'center',
      },
      {
        title: 'Very large dashboards',
        body: 'If your dashboard has a lot of data rows, the compressed link may exceed URL limits. In that case, dataset rows are automatically stripped — recipients see the layout but charts show no data.',
        placement: 'center',
      },
      {
        title: 'Embed code',
        body: 'Use "Get embed code" in the ••• menu to generate an iframe snippet you can paste into a SharePoint page or any website that accepts HTML embeds.',
        placement: 'center',
      },
    ],
  },

};
