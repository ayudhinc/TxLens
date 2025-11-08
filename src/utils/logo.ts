import chalk from 'chalk';

/**
 * Display TxLens ASCII logo
 */
export function displayLogo(): void {
  const logo = `
${chalk.cyan('▀█▀ ▀▄▀ █░░ █▀▀ █▄░█ █▀')}
${chalk.cyan('░█░ █░█ █▄▄ ██▄ █░▀█ ▄█')}

${chalk.dim('Solana Transaction Decoder')}
${chalk.dim('v1.0.0')}
`;

  console.log(logo);
}

/**
 * Alternative larger logo
 */
export function displayLargeLogo(): void {
  const logo = `
${chalk.cyan('████████╗██╗  ██╗██╗     ███████╗███╗   ██╗███████╗')}
${chalk.cyan('╚══██╔══╝╚██╗██╔╝██║     ██╔════╝████╗  ██║██╔════╝')}
${chalk.cyan('   ██║    ╚███╔╝ ██║     █████╗  ██╔██╗ ██║███████╗')}
${chalk.cyan('   ██║    ██╔██╗ ██║     ██╔══╝  ██║╚██╗██║╚════██║')}
${chalk.cyan('   ██║   ██╔╝ ██╗███████╗███████╗██║ ╚████║███████║')}
${chalk.cyan('   ╚═╝   ╚═╝  ╚═╝╚══════╝╚══════╝╚═╝  ╚═══╝╚══════╝')}

${chalk.dim('Decode and explain Solana blockchain transactions')}
${chalk.dim('v1.0.0')}
`;

  console.log(logo);
}
