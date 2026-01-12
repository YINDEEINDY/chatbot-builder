BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[User] (
    [id] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(1000) NOT NULL,
    [password] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [User_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [User_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [User_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[Bot] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000),
    [userId] NVARCHAR(1000) NOT NULL,
    [facebookPageId] NVARCHAR(1000),
    [facebookToken] NVARCHAR(1000),
    [webhookVerifyToken] NVARCHAR(1000) NOT NULL,
    [isActive] BIT NOT NULL CONSTRAINT [Bot_isActive_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Bot_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Bot_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Flow] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [botId] NVARCHAR(1000) NOT NULL,
    [nodes] NVARCHAR(max) NOT NULL CONSTRAINT [Flow_nodes_df] DEFAULT '[]',
    [edges] NVARCHAR(max) NOT NULL CONSTRAINT [Flow_edges_df] DEFAULT '[]',
    [isDefault] BIT NOT NULL CONSTRAINT [Flow_isDefault_df] DEFAULT 0,
    [isActive] BIT NOT NULL CONSTRAINT [Flow_isActive_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Flow_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Flow_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[UserSession] (
    [id] NVARCHAR(1000) NOT NULL,
    [botId] NVARCHAR(1000) NOT NULL,
    [senderId] NVARCHAR(1000) NOT NULL,
    [currentNodeId] NVARCHAR(1000),
    [context] NVARCHAR(max) NOT NULL CONSTRAINT [UserSession_context_df] DEFAULT '{}',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [UserSession_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [UserSession_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [UserSession_botId_senderId_key] UNIQUE NONCLUSTERED ([botId],[senderId])
);

-- CreateTable
CREATE TABLE [dbo].[Message] (
    [id] NVARCHAR(1000) NOT NULL,
    [botId] NVARCHAR(1000) NOT NULL,
    [senderId] NVARCHAR(1000) NOT NULL,
    [content] NVARCHAR(1000) NOT NULL,
    [direction] NVARCHAR(1000) NOT NULL,
    [messageType] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Message_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Message_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Analytics] (
    [id] NVARCHAR(1000) NOT NULL,
    [botId] NVARCHAR(1000) NOT NULL,
    [date] DATE NOT NULL,
    [totalMessages] INT NOT NULL CONSTRAINT [Analytics_totalMessages_df] DEFAULT 0,
    [incomingMessages] INT NOT NULL CONSTRAINT [Analytics_incomingMessages_df] DEFAULT 0,
    [outgoingMessages] INT NOT NULL CONSTRAINT [Analytics_outgoingMessages_df] DEFAULT 0,
    [uniqueUsers] INT NOT NULL CONSTRAINT [Analytics_uniqueUsers_df] DEFAULT 0,
    CONSTRAINT [Analytics_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Analytics_botId_date_key] UNIQUE NONCLUSTERED ([botId],[date])
);

-- AddForeignKey
ALTER TABLE [dbo].[Bot] ADD CONSTRAINT [Bot_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Flow] ADD CONSTRAINT [Flow_botId_fkey] FOREIGN KEY ([botId]) REFERENCES [dbo].[Bot]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[UserSession] ADD CONSTRAINT [UserSession_botId_fkey] FOREIGN KEY ([botId]) REFERENCES [dbo].[Bot]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Message] ADD CONSTRAINT [Message_botId_fkey] FOREIGN KEY ([botId]) REFERENCES [dbo].[Bot]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Analytics] ADD CONSTRAINT [Analytics_botId_fkey] FOREIGN KEY ([botId]) REFERENCES [dbo].[Bot]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
