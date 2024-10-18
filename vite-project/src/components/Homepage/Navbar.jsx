import React, { useContext } from "react";
import { HiMenuAlt4 } from "react-icons/hi";
import { AiOutlineClose } from "react-icons/ai";
import { Link, useNavigate } from "react-router-dom";
import { Tooltip } from "react-tooltip";

import { TransactionContext } from "../../context/TransactionContext";

const NavBarItem = ({ title, path, classprops, closeMenu }) => (
  <li className={`mx-4 cursor-pointer ${classprops}`}>
    <Link to={path} onClick={closeMenu}>
      {title}
    </Link>
  </li>
);

const Navbar = () => {
  const [toggleMenu, setToggleMenu] = React.useState(false);
  const { connectWallet, currentAccount, disconnectWallet, isConnectedToSite } =
    useContext(TransactionContext);
  const navigate = useNavigate();

  const handleConnect = async () => {
    try {
      await connectWallet();
      // The user will need to sign a message in MetaMask
    } catch (error) {
      console.error("Failed to connect:", error);
    }
  };

  const handleDisconnect = () => {
    disconnectWallet();
    navigate("/");
  };

  return (
    <nav className="w-full flex md:justify-center justify-between items-center p-4 bg-gray-800 shadow-lg z-50">
      <div className="md:flex-[0.5] flex-initial justify-center items-center text-teal-400 text-3xl font-bold">
        <Link to="/">CRYPTO PORTFOLIO</Link>
      </div>

      {/* Navbar links for larger screens */}
      {isConnectedToSite && (
        <ul className="text-white md:flex hidden list-none flex-row justify-between items-center flex-initial">
          {[
            { title: "Home", path: "/" },
            { title: "Watchlist", path: "/watchlist" },
            { title: "Transfer", path: "/transfer" },
            { title: "Approve Allowance", path: "/approveallowance" },
            { title: "Allowance Check", path: "/allowancecheck" },
          ].map((item, index) => (
            <NavBarItem key={index} title={item.title} path={item.path} />
          ))}
        </ul>
      )}

      {/* Mobile menu toggle */}
      <div className="flex relative">
        {!toggleMenu ? (
          <HiMenuAlt4
            fontSize={28}
            className="text-white md:hidden cursor-pointer"
            onClick={() => setToggleMenu(true)}
            aria-label="Open menu"
          />
        ) : (
          <AiOutlineClose
            fontSize={28}
            className="text-white md:hidden cursor-pointer"
            onClick={() => setToggleMenu(false)}
            aria-label="Close menu"
          />
        )}

        {toggleMenu && (
          <ul
            className="z-10 fixed top-0 right-0 p-3 w-[70vw] h-screen shadow-2xl md:hidden list-none
            flex flex-col justify-start items-end rounded-md bg-gray-900 text-white animate-slide-in"
          >
            <li className="text-xl w-full my-2">
              <AiOutlineClose
                onClick={() => setToggleMenu(false)}
                aria-label="Close menu"
              />
            </li>
            {[
              { title: "Home", path: "/" },
              { title: "Watchlist", path: "/watchlist" },
              { title: "Transfer", path: "/transfer" },
              { title: "Approve Allowance", path: "/approveallowance" },
              { title: "Allowance Check", path: "/allowancecheck" },
            ].map((item, index) => (
              <NavBarItem
                key={index}
                title={item.title}
                path={item.path}
                classprops="my-2 text-lg"
                closeMenu={() => setToggleMenu(false)} // Close menu on link click
              />
            ))}
          </ul>
        )}
      </div>

      {/* Wallet Connection Section */}
      <div className="flex items-center space-x-4">
        {isConnectedToSite ? (
          <div className="flex items-center space-x-2">
            <p className="text-gray-300">{`${currentAccount.slice(
              0,
              6
            )}...${currentAccount.slice(-4)}`}</p>
            <button
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition duration-200"
              onClick={handleDisconnect}
            >
              Disconnect
            </button>
          </div>
        ) : (
          <button
            className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded transition duration-200"
            onClick={handleConnect}
            data-tooltip-id="connect-wallet-tooltip"
            data-tooltip-content="Connect your Ethereum wallet to interact with the app"
          >
            Connect Wallet
          </button>
        )}
        <Tooltip id="connect-wallet-tooltip" />
      </div>
    </nav>
  );
};

export default Navbar;
