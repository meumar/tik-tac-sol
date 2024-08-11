use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer as SplTransfer};

declare_id!("4Gm8PQDpbvYTePZXAGmh25Jed1EMhLbHJg5xogFPsrGv");

#[program]
mod hello_anchor {
    use super::*;
    //Create program wallet
    pub fn create_game_wallet(_ctx: Context<CreateGameWallet>) -> Result<()> {
        msg!("Game wallet created");
        Ok(())
    }

    //Create program token account
    pub fn create_game_token_account(_ctx: Context<CreateTokenAccount>) -> Result<()> {
        msg!("Game token created");
        Ok(())
    }

    //Initiate account and transfer funds
    pub fn request_game(ctx: Context<RequestGame>, bet_amount: u64) -> Result<()> {
        //Funds transfer
        let player = &ctx.accounts.signer;
        let player_ata = &ctx.accounts.player_ata;

        let destination = &ctx.accounts.program_ata;
        let token_program = &ctx.accounts.token_program;

        //Check user has insufficient balance
        let player_amount: u64 = ctx.accounts.player_ata.amount;
        msg!("Player balance {} {}", player_amount, bet_amount);
        if player_amount < bet_amount {
            return err!(GameError::InsufficientBalance);
        }

        //Player transfer
        let cpi_accounts = SplTransfer {
            from: player_ata.to_account_info().clone(),
            to: destination.to_account_info().clone(),
            authority: player.to_account_info().clone(),
        };
        let cpi_program = token_program.to_account_info();

        token::transfer(CpiContext::new(cpi_program, cpi_accounts), bet_amount)?;

        // //Game Initialization
        let account_data = &mut ctx.accounts.game_request;
        account_data.player = *ctx.accounts.signer.key;
        account_data.token_account = ctx.accounts.mint.key();
        account_data.bet_amount = bet_amount;
        account_data.state = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
        account_data.turn = *ctx.accounts.signer.key;
        account_data.game_state = 0;

        emit!(NewGameCreated {
            game: ctx.accounts.game_request.key(),
            amount: bet_amount
        });
        msg!("Game request created successfully");
        Ok(())
    }

    //Joining to existed game and transfer funds
    pub fn join_game(ctx: Context<JoinGame>) -> Result<()> {
        let player = &ctx.accounts.signer;
        let player_ata = &ctx.accounts.player_ata;

        let destination = &ctx.accounts.program_ata;
        let token_program = &ctx.accounts.token_program;

        let account_data = &mut ctx.accounts.game_request;
        let bet_amount = account_data.bet_amount;

        //Check user has insufficient balance
        let player_amount: u64 = ctx.accounts.player_ata.amount;
        msg!("Player balance {} {}", player_amount, bet_amount);
        if player_amount < bet_amount {
            return err!(GameError::InsufficientBalance);
        }
        //Transfer funds from player
        let cpi_accounts = SplTransfer {
            from: player_ata.to_account_info().clone(),
            to: destination.to_account_info().clone(),
            authority: player.to_account_info().clone(),
        };
        let cpi_program = token_program.to_account_info();

        token::transfer(CpiContext::new(cpi_program, cpi_accounts), bet_amount)?;

        // Adding player Initialization
        account_data.other_player = *ctx.accounts.signer.key;
        account_data.game_state = 1;
        msg!("Joined game successfully");
        Ok(())
    }

    //Player making the move
    pub fn make_move(ctx: Context<MakeMove>, row: u8, col: u8, bump: u8) -> Result<()> {
        let account_data = &mut ctx.accounts.game_request;
        let player1 = account_data.player;
        let player2 = account_data.other_player;
        let current_turn = account_data.turn;
        let amount = account_data.bet_amount;
        let mut game_board = account_data.state;

        let current_player = *ctx.accounts.signer.key;

        if current_turn.key().to_string() != current_player.to_string() {
            return err!(GameError::InvalidUser);
        }

        let mut check_move = false;
        if row == 0 || row == 1 || row == 2 {
            if col == 0 || col == 1 || col == 2 {
                check_move = true;
            }
        }
        if game_board[row as usize][col as usize] != 0 {
            check_move = false
        }

        if check_move == false {
            return err!(GameError::InvalidMove);
        }

        let mut move_symbol = 1;
        let mut next_user = player2;

        if current_player.to_string() == player2.to_string() {
            next_user = player1;
            move_symbol = 2;
        }

        game_board[row as usize][col as usize] = move_symbol;
        account_data.state = game_board;
        account_data.turn = next_user;

        let mut result: u8 = 0;
        for row in account_data.state {
            if row[0] != 0 && row[0] == row[1] && row[1] == row[2] {
                result = row[0];
            }
        }
        for col in 0..3 {
            if account_data.state[0][col] != 0
                && account_data.state[0][col] == account_data.state[1][col]
                && account_data.state[1][col] == account_data.state[2][col]
                && result == 0
            {
                result = account_data.state[0][col];
            }
        }

        if account_data.state[0][0] != 0
            && account_data.state[0][0] == account_data.state[1][1]
            && account_data.state[1][1] == account_data.state[2][2]
            && result == 0
        {
            result = account_data.state[0][0];
        }
        if account_data.state[0][2] != 0
            && account_data.state[0][2] == account_data.state[1][1]
            && account_data.state[1][1] == account_data.state[2][0]
            && result == 0
        {
            result = account_data.state[0][2];
        }

        //Current player is made a move and so he/her is the winner

        if result == 1 || result == 2 {
            msg!("Someone is won {}", result);
            account_data.game_state = result + 1;
            account_data.winner = current_player;

            let bump_vector = bump.to_le_bytes();
            let inner = vec![b"wallet".as_ref(), bump_vector.as_ref()];
            let outer = vec![inner.as_slice()];

            //trnafer funds,
            let transfer_instruction = SplTransfer {
                from: ctx.accounts.program_ata.to_account_info(),
                to: ctx.accounts.player_ata.to_account_info(),
                authority: ctx.accounts.game_wallet.to_account_info(),
            };

            let cpi_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                transfer_instruction,
                outer.as_slice(),
            );
            anchor_spl::token::transfer(cpi_ctx, amount * 2)?;
        } else if account_data.state.iter().flatten().all(|&cell| cell != 0) {
            msg!("Draw match");
            account_data.game_state = 4;

            let bump_vector = bump.to_le_bytes();
            let inner = vec![b"wallet".as_ref(), bump_vector.as_ref()];
            let outer = vec![inner.as_slice()];

            //trnafer funds to player 1
            let transfer_instruction1 = SplTransfer {
                from: ctx.accounts.program_ata.to_account_info(),
                to: ctx.accounts.player_ata.to_account_info(),
                authority: ctx.accounts.game_wallet.to_account_info(),
            };

            let cpi_ctx1 = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                transfer_instruction1,
                outer.as_slice(),
            );
            anchor_spl::token::transfer(cpi_ctx1, amount)?;

            //trnafer funds to player 2
            let transfer_instruction2 = SplTransfer {
                from: ctx.accounts.program_ata.to_account_info(),
                to: ctx.accounts.other_player_ata.to_account_info(),
                authority: ctx.accounts.game_wallet.to_account_info(),
            };

            let cpi_ctx2 = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                transfer_instruction2,
                outer.as_slice(),
            );
            anchor_spl::token::transfer(cpi_ctx2, amount)?;
        } else {
            msg!("Continue the match");
            account_data.game_state = 1;
        }

        emit!(UserMakeMove {
            row: row,
            col: col,
            move_symbol: move_symbol,
            game_state: account_data.game_state,
            next_user: next_user,
            winner: account_data.winner
        });
        Ok(())
    }
}

#[derive(Accounts)]
pub struct JoinGame<'info> {
    #[account(mut)]
    pub player_ata: Account<'info, TokenAccount>,

    #[account(mut)]
    pub program_ata: Account<'info, TokenAccount>,

    #[account(mut)]
    pub game_request: Account<'info, RequestAccount>,

    #[account(mut, seeds=[b"wallet".as_ref()], bump)]
    pub game_wallet: Account<'info, State>,

    #[account(mut)]
    pub signer: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MakeMove<'info> {
    #[account(mut)]
    pub player_ata: Account<'info, TokenAccount>,

    #[account(mut)]
    pub other_player_ata: Account<'info, TokenAccount>,

    #[account(mut)]
    pub program_ata: Account<'info, TokenAccount>,

    pub mint: Account<'info, Mint>,

    #[account(mut)]
    pub game_request: Account<'info, RequestAccount>,

    #[account(mut, seeds=[b"wallet".as_ref()], bump)]
    pub game_wallet: Account<'info, State>,

    #[account(mut)]
    pub signer: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateGameWallet<'info> {
    #[account(init, payer = signer, seeds=[b"wallet".as_ref()], bump, space = 8 + RequestAccount::INIT_SPACE)]
    pub game_wallet: Account<'info, State>,
    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateTokenAccount<'info> {
    #[account(
        init,
        seeds = [mint.key().as_ref()],
        bump,
        payer = signer,
        token::mint = mint,
        token::authority = game_wallet,
     )]
    pub game_token_account: Account<'info, TokenAccount>,
    pub game_wallet: Account<'info, State>,
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub signer: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct State {
    game_address: Pubkey,
}

#[derive(Accounts)]
pub struct RequestGame<'info> {
    #[account(mut)]
    pub player_ata: Account<'info, TokenAccount>,

    #[account(mut)]
    pub program_ata: Account<'info, TokenAccount>,

    pub mint: Account<'info, Mint>,

    #[account(init, payer = signer, space = 8 + RequestAccount::INIT_SPACE)]
    pub game_request: Account<'info, RequestAccount>,
    #[account(mut)]
    pub signer: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
#[account]
#[derive(InitSpace)]
pub struct RequestAccount {
    pub player: Pubkey,
    pub token_account: Pubkey,
    pub bet_amount: u64,

    pub game_state: u8,
    pub state: [[u8; 3]; 3],
    pub turn: Pubkey,
    pub other_player: Pubkey,
    pub winner: Pubkey,
}

//Error messages
#[error_code]
pub enum GameError {
    #[msg("INVALID_USER: It's not your turn")]
    InvalidUser,
    #[msg("INVALID_MOVE: Position already taken")]
    InvalidMove,
    #[msg("INVALID_GAME: Game already finished")]
    InvalidGame,
    #[msg("INVALID_INSUFFICIENT_BALANCE: Gamers doesn't have enough balance to play the game")]
    InsufficientBalance,
}

#[event]
pub struct NewGameCreated {
    game: Pubkey,
    amount: u64,
}

#[event]
pub struct UserMakeMove {
    row: u8,
    col: u8,
    move_symbol: u8,
    game_state: u8,
    next_user: Pubkey,
    winner: Pubkey,
}
